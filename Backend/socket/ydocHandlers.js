const Y = require('yjs');
const { getRoom } = require('../services/YRoomManager');

const registerYdocHandlers = (io, socket) => {
  socket.on('doc:sync', async (clientStateVector, ack) => {
    const roomId = socket.data.roomId;
    if (!roomId) return ack?.({ ok: false, error: 'Join a room first' });

    try {
      const { ydoc } = await getRoom(roomId);

      const missing = Y.encodeStateAsUpdate(
        ydoc,
        clientStateVector ? new Uint8Array(clientStateVector) : undefined
      );

      ack?.({
        ok: true,
        update: missing,                     
        stateVector: Y.encodeStateVector(ydoc), 
      });
    } catch (err) {
      console.error('doc:sync error:', err);
      ack?.({ ok: false, error: 'Sync failed' });
    }
  });

  socket.on('doc:update', async (update) => {
    const roomId = socket.data.roomId;
    if (!roomId || !update) return;

    try {
      const state = await getRoom(roomId);
      Y.applyUpdate(state.ydoc, new Uint8Array(update), socket.id);

      state.dirty = true;
      socket.to(roomId).emit('doc:update', update);
    } catch (err) {
      console.error('doc:update error:', err);
    }
  });
};

module.exports = registerYdocHandlers;
