// Yjs traffic for one socket: the initial catch-up, then the live stream of
// edits and cursor movements.
//
//   doc:sync         once per connection - "what did I miss?"
//   doc:update       every edit, in both directions
//   awareness:update every cursor/selection move
//
// Updates are relayed as the exact bytes the sender produced. Yjs updates are
// commutative and idempotent, so re-encoding them server-side would cost more
// and change nothing.

const Y = require('yjs');
const { applyAwarenessUpdate, encodeAwarenessUpdate } = require('y-protocols/awareness');
const { getRoom } = require('../services/YRoomManager');

// Flood guards. A normal keystroke is ~20 bytes; the initial catch-up after a
// reconnect is the only legitimately large message, hence the generous ceiling.
const MAX_UPDATE_BYTES = 512 * 1024;
const MAX_UPDATES_PER_SECOND = 150;

const withinRateLimit = (socket, byteLength) => {
  if (byteLength > MAX_UPDATE_BYTES) {
    console.warn(`Socket ${socket.id} sent an oversized update (${byteLength} bytes)`);
    return false;
  }

  const now = Date.now();
  const bucket = socket.data.updateBucket;

  if (!bucket || now - bucket.startedAt >= 1000) {
    socket.data.updateBucket = { startedAt: now, count: 1 };
    return true;
  }

  bucket.count += 1;
  if (bucket.count > MAX_UPDATES_PER_SECOND) {
    console.warn(`Socket ${socket.id} exceeded the update rate limit`);
    return false;
  }
  return true;
};

// Everything known about who is present, for a client that just arrived.
const encodeAllAwareness = (awareness) => {
  const clients = [...awareness.getStates().keys()];
  if (clients.length === 0) return null;
  return encodeAwarenessUpdate(awareness, clients);
};

const registerYdocHandlers = (io, socket) => {
  socket.on('doc:sync', async (clientStateVector, ack) => {
    const roomId = socket.data.roomId;
    if (!roomId) return ack?.({ ok: false, error: 'Join a room first' });

    try {
      const { ydoc, awareness } = await getRoom(roomId);

      // Send only what this client is missing, not the whole document.
      const missing = Y.encodeStateAsUpdate(
        ydoc,
        clientStateVector ? new Uint8Array(clientStateVector) : undefined
      );

      ack?.({
        ok: true,
        update: missing,
        stateVector: Y.encodeStateVector(ydoc),
        awareness: encodeAllAwareness(awareness),
      });
    } catch (err) {
      console.error('doc:sync error:', err);
      ack?.({ ok: false, error: 'Sync failed' });
    }
  });

  socket.on('doc:update', async (update) => {
    const roomId = socket.data.roomId;
    if (!roomId || !update) return;
    if (!withinRateLimit(socket, update.byteLength ?? update.length ?? 0)) return;

    try {
      const state = await getRoom(roomId);
      Y.applyUpdate(state.ydoc, new Uint8Array(update), socket.id);

      // Marks the room for the next autosave sweep.
      state.dirty = true;

      // socket.to() excludes the sender, which is what stops an edit echoing
      // back to its own author.
      socket.to(roomId).emit('doc:update', update);
    } catch (err) {
      console.error('doc:update error:', err);
    }
  });

  socket.on('awareness:update', async (payload) => {
    const roomId = socket.data.roomId;
    if (!roomId || !payload?.update) return;
    if (!withinRateLimit(socket, payload.update.byteLength ?? payload.update.length ?? 0)) return;

    try {
      const { awareness } = await getRoom(roomId);

      // Remembered so the disconnect handler can retire this client's cursor.
      if (payload.clientId != null) socket.data.clientId = payload.clientId;

      applyAwarenessUpdate(awareness, new Uint8Array(payload.update), socket.id);
      socket.to(roomId).emit('awareness:update', payload.update);
    } catch (err) {
      console.error('awareness:update error:', err);
    }
  });
};

module.exports = registerYdocHandlers;
