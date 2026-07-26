const Y = require('yjs');
const pool = require('../config/db');
const db = pool.promise();

const rooms = new Map(); //Mapping of roomId to Y.Doc instances

const TEXT_KEY = 'monaco';

//Building the Y.doc from whatever Mysql has 
const hydrate = async(roomId) => {
  const [rows] = await db.query('SELECT ydoc_state FROM rooms WHERE id = ?', [roomId]);
  if (rows.length === 0) {
    throw new Error(`Room with id ${roomId} does not exist`);
  } 
  const row = rows[0];
  const ydoc = new Y.Doc();
  const ytext = ydoc.getText(TEXT_KEY);
  if(row?.ydoc_state?.length){
    Y.applyUpdate(ydoc, new Uint8Array(row.ydoc_state));
  }else if(row?.code){
    ydoc.transact(() => ytext.insert(0, row.code));
  }

  console.log(`Y.Doc got for room ${roomId} with length ${ytext.length}`);
  return {roomId, ydoc, ytext, dirty: false};
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
  const blob = Buffer.from(Y.encodeStateAsUpdate(state.ydoc));

  await db.query(
    'UPDATE rooms SET code = ?, ydoc_state = ? WHERE id = ?',
    [code, blob, state.roomId]
  );

  state.dirty = false;
};
const closeRoom = async (roomId) => {
  const pending = rooms.get(roomId);
  if (!pending) return;

  rooms.delete(roomId);

  try {
    const state = await pending;
    await persistRoom(state);
    state.ydoc.destroy();
    console.log(`Room ${roomId} saved and closed`);
  } catch (err) {
    console.error(`Failed to close room ${roomId}:`, err.message);
  }
};

module.exports = { getRoom, persistRoom, closeRoom, rooms, TEXT_KEY };