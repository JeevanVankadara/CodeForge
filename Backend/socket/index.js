// Wires every socket feature onto the io server: authentication, seat
// ownership, the Yjs relay and the shared run. server.js only calls this.

const socketAuth = require('../middlewares/socketAuth');
const { claimSeat, releaseSeat } = require('../services/roomMembership');
const registerYdocHandlers = require('./ydocHandlers');
const registerRunHandlers = require('./runHandlers');
const registerVoiceHandlers = require('./voiceHandlers');
const { getRoom, closeRoom, dropAwareness } = require('../services/YRoomManager');

// A room holds 3 people. These caps are about connections, not membership: they
// stop one person opening tabs until the server runs out of memory. The seat
// rules in roomMembership.js are still what decides who may enter at all.
const MAX_SOCKETS_PER_ROOM = 6;
const MAX_SOCKETS_PER_USER = 3;

const listMembers = async (io, roomId) => {
  const sockets = await io.in(roomId).fetchSockets();
  const byUser = new Map();

  for (const s of sockets) {
    const { id, email } = s.data.user;
    if (!byUser.has(id)) {
      byUser.set(id, { id, email, seat: s.data.seat, sockets: 0 });
    }
    byUser.get(id).sockets += 1;
  }

  return [...byUser.values()];
};

const hasAnotherSocket = async (io, roomId, userId, excludeSocketId) => {
  const sockets = await io.in(roomId).fetchSockets();
  return sockets.some((s) => s.data.user.id === userId && s.id !== excludeSocketId);
};

const registerSocketHandlers = (io) => {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`Socket ${socket.id} connected (user ${user.id})`);

    // All three refuse to act until this socket has joined a room, so
    // registering them up front is safe.
    registerYdocHandlers(io, socket);
    registerRunHandlers(io, socket);
    registerVoiceHandlers(io, socket);

    socket.on('room:join', async (roomId, ack) => {
      try {
        if (typeof roomId !== 'string' || !roomId) {
          return ack?.({ ok: false, error: 'Invalid room id' });
        }
        if (socket.data.roomId) {
          return ack?.({ ok: false, error: 'This socket already joined a room' });
        }

        // Connection caps, checked before we touch the database.
        const open = await io.in(roomId).fetchSockets();
        if (open.length >= MAX_SOCKETS_PER_ROOM) {
          return ack?.({ ok: false, error: 'Too many open connections for this room' });
        }
        if (open.filter((s) => s.data.user.id === user.id).length >= MAX_SOCKETS_PER_USER) {
          return ack?.({ ok: false, error: 'Too many open tabs for this room' });
        }

        const result = await claimSeat(roomId, user.id);
        if (!result.ok) {
          return ack?.({ ok: false, error: 'Maximum size of room is reached' });
        }

        socket.data.roomId = roomId;
        socket.data.seat = result.seat;

        await socket.join(roomId);

        // Warm the document up now so the client's doc:sync doesn't wait on Postgres.
        await getRoom(roomId);

        const members = await listMembers(io, roomId);
        io.to(roomId).emit('room:members', members);

        ack?.({
          ok: true,
          seat: result.seat,
          room: {
            id: roomId,
            language: result.room.language,
            code: result.room.code ?? '',
          },
          members,
        });
      } catch (err) {
        console.error('room:join error:', err);
        ack?.({ ok: false, error: 'Internal server error' });
      }
    });

    socket.on('disconnect', async (reason) => {
      const roomId = socket.data.roomId;
      console.log(`Socket ${socket.id} disconnected (${reason})`);
      if (!roomId) return;

      try {
        if (socket.data.clientId != null) {
          await dropAwareness(roomId, socket.data.clientId);
          io.to(roomId).emit('awareness:remove', socket.data.clientId);
        }

        const stillHere = await hasAnotherSocket(io, roomId, user.id, socket.id);

        if (!stillHere) {
          await releaseSeat(roomId, user.id);
          io.to(roomId).emit('room:peer-left', { id: user.id });
        }

        io.to(roomId).emit('room:members', await listMembers(io, roomId));

        // Nobody left in the room -> save the document and release the memory.
        const remaining = await io.in(roomId).fetchSockets();
        if (remaining.length === 0) {
          await closeRoom(roomId);
        }
      } catch (err) {
        console.error('disconnect cleanup error:', err);
      }
    });
  });
};

module.exports = registerSocketHandlers;
