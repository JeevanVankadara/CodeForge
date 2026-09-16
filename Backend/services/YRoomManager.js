// Owns every live room document.
//
// While at least one person is connected, a room lives here as an in-memory
// Y.Doc holding three things:
//   ytext ('monaco')  - the shared code
//   ymeta ('meta')    - shared settings: the language and the loaded problem id
//   awareness         - who is present and where their cursor is
//
// MySQL is written from here and nowhere else: every 15 seconds for rooms that
// changed, and once more when the last person leaves.

const Y = require('yjs');
const { Awareness, removeAwarenessStates } = require('y-protocols/awareness');
const pool = require('../config/db');
const db = pool.promise();

const rooms = new Map(); //Mapping of roomId to Y.Doc instances

const TEXT_KEY = 'monaco';
const META_KEY = 'meta';

const AUTOSAVE_MS = 15000;

// ydoc_state is a MEDIUMBLOB (16MB ceiling). We warn well before that and refuse
// to attempt the write past the hard limit, so a huge document degrades to
// "text saved, snapshot skipped" instead of a failed UPDATE that saves nothing.
const STATE_WARN_BYTES = 4 * 1024 * 1024;
const STATE_MAX_BYTES = 15 * 1024 * 1024;

// A run whose finally-block never fired (process killed mid-run) must not block
// the room forever, so a lock older than this is treated as stale.
//
// It has to comfortably exceed RUN_WAIT_MS (the queue-wait ceiling, 150s by
// default). A run that sits in a busy queue and then executes is perfectly
// healthy, and must not have its lock stolen by another member while it is
// still going.
const RUN_LOCK_TTL_MS = 4 * 60 * 1000;

//Building the Y.doc from whatever Mysql has
const hydrate = async(roomId) => {
  const [rows] = await db.query('SELECT code, language, ydoc_state FROM rooms WHERE id = ?', [roomId]);
  if (rows.length === 0) {
    throw new Error(`Room with id ${roomId} does not exist`);
  }
  const row = rows[0];
  const ydoc = new Y.Doc();
  const ytext = ydoc.getText(TEXT_KEY);
  const ymeta = ydoc.getMap(META_KEY);

  if(row?.ydoc_state?.length){
    Y.applyUpdate(ydoc, new Uint8Array(row.ydoc_state));
  }else if(row?.code){
    ydoc.transact(() => ytext.insert(0, row.code));
  }

  // Older snapshots predate the shared-language map, so seed it from the column.
  if (!ymeta.get('language')) {
    ydoc.transact(() => ymeta.set('language', row?.language || 'cpp'));
  }

  // The shared document must only ever contain "\n". Monaco rewrites text it is
  // given to match its own line endings, so a stray "\r\n" makes one editor
  // count a newline as two characters and another as one - after which every
  // offset past the first newline is wrong and edits land in the wrong place.
  // Doing it here is race-free: hydration happens once, before anyone connects.
  const raw = ytext.toString();
  if (raw.includes('\r')) {
    ydoc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
    });
    console.log(`Normalised Windows line endings in room ${roomId}`);
  }

  const awareness = new Awareness(ydoc);
  awareness.setLocalState(null);

  console.log(`Y.Doc got for room ${roomId} with length ${ytext.length}`);
  return {
    roomId,
    ydoc,
    ytext,
    ymeta,
    awareness,
    dirty: false,
    run: { busy: false, by: null, name: null, startedAt: 0 },
  };
}

const getRoom = (roomId) => {
  if (!rooms.has(roomId)) {
    const pending = hydrate(roomId).catch((err) => {
      rooms.delete(roomId);
      throw err;
    });
    rooms.set(roomId, pending);
  }
  return rooms.get(roomId);
};

const persistRoom = async (state) => {
  const code = state.ytext.toString();
  const language = state.ymeta.get('language') || 'cpp';
  const blob = Buffer.from(Y.encodeStateAsUpdate(state.ydoc));

  if (blob.length > STATE_WARN_BYTES) {
    console.warn(`Room ${state.roomId} snapshot is ${(blob.length / 1024 / 1024).toFixed(1)}MB`);
  }

  if (blob.length > STATE_MAX_BYTES) {
    console.error(`Room ${state.roomId} snapshot too large, saving text only`);
    await db.query(
      'UPDATE rooms SET code = ?, language = ? WHERE id = ?',
      [code, language, state.roomId]
    );
  } else {
    await db.query(
      'UPDATE rooms SET code = ?, language = ?, ydoc_state = ? WHERE id = ?',
      [code, language, blob, state.roomId]
    );
  }

  state.dirty = false;
};

// Manual Save button: the server's document is the truth, so write that rather
// than whatever text the caller happened to have. Returns false when the room
// has no live document (nobody connected), letting the caller fall back to HTTP.
const persistRoomById = async (roomId) => {
  const pending = rooms.get(roomId);
  if (!pending) return false;

  const state = await pending;
  await persistRoom(state);
  return true;
};

const closeRoom = async (roomId) => {
  const pending = rooms.get(roomId);
  if (!pending) return;

  rooms.delete(roomId);

  try {
    const state = await pending;
    await persistRoom(state);
    state.awareness.destroy();
    state.ydoc.destroy();
    console.log(`Room ${roomId} saved and closed`);
  } catch (err) {
    console.error(`Failed to close room ${roomId}:`, err.message);
  }
};

const dropAwareness = async (roomId, clientId) => {
  const pending = rooms.get(roomId);
  if (!pending || clientId == null) return;

  try {
    const state = await pending;
    removeAwarenessStates(state.awareness, [clientId], 'server');
  } catch {
    return;
  }
};

// ---------------------------------------------------------------------------
// Shared run lock: only one member may run the room's code at a time.
// ---------------------------------------------------------------------------

const acquireRunLock = async (roomId, user) => {
  const pending = rooms.get(roomId);
  if (!pending) return { ok: false, error: 'Room is not open' };

  const state = await pending;
  const stale = Date.now() - state.run.startedAt > RUN_LOCK_TTL_MS;

  if (state.run.busy && !stale) {
    return { ok: false, error: `${state.run.name} is already running this code` };
  }

  state.run = { busy: true, by: user.id, name: user.email, startedAt: Date.now() };
  return { ok: true, state };
};

const releaseRunLock = (state) => {
  if (state) state.run = { busy: false, by: null, name: null, startedAt: 0 };
};

// ---------------------------------------------------------------------------
// Autosave
// ---------------------------------------------------------------------------

let autosaveTimer = null;

// Only rooms flagged dirty by an edit are written, so an idle room costs nothing.
const flushDirtyRooms = async () => {
  for (const [roomId, pending] of [...rooms.entries()]) {
    try {
      const state = await pending;
      if (!state.dirty) continue;
      await persistRoom(state);
      console.log(`Autosaved room ${roomId}`);
    } catch (err) {
      console.error(`Autosave failed for room ${roomId}:`, err.message);
    }
  }
};

// Writes every open room whether dirty or not. Used on shutdown.
const flushAll = async () => {
  for (const [roomId, pending] of [...rooms.entries()]) {
    try {
      await persistRoom(await pending);
    } catch (err) {
      console.error(`Final save failed for room ${roomId}:`, err.message);
    }
  }
};

const startAutosave = () => {
  if (autosaveTimer) return;
  autosaveTimer = setInterval(() => {
    flushDirtyRooms().catch((err) => console.error('Autosave sweep failed:', err.message));
  }, AUTOSAVE_MS);
  // Don't let the timer alone keep the process alive.
  autosaveTimer.unref?.();
  console.log(`Autosave running every ${AUTOSAVE_MS / 1000}s`);
};

const stopAutosave = () => {
  if (!autosaveTimer) return;
  clearInterval(autosaveTimer);
  autosaveTimer = null;
};

module.exports = {
  getRoom,
  persistRoom,
  persistRoomById,
  closeRoom,
  dropAwareness,
  acquireRunLock,
  releaseRunLock,
  startAutosave,
  stopAutosave,
  flushAll,
  rooms,
  TEXT_KEY,
  META_KEY,
};
