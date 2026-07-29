// WebRTC signalling. Audio never travels through this server - peers send it
// straight to each other. All that passes through here is the paperwork two
// browsers need in order to find one another: session descriptions and ICE
// candidates, relayed byte for byte and never inspected.
//
//   voice:join        ack -> our own id + who is already on the call
//   voice:peer-joined broadcast, someone new to connect to
//   voice:signal      relayed to exactly one named peer
//   voice:peer-state  broadcast, someone muted or unmuted
//   voice:peer-left    broadcast, tear that connection down
//
// Identity here is socket.id, not user.id. A peer connection terminates at a
// tab, and one user may have several open - see the one-tab rule in voice:join.

// Anything else is not something two peers legitimately exchange.
const SIGNAL_KINDS = new Set(['offer', 'answer', 'candidate']);

// An SDP offer is a few KB, an ICE candidate a couple of hundred bytes.
const MAX_SIGNAL_BYTES = 64 * 1024;

// Almost all of these are ICE candidates, and the count is driven by how many
// network interfaces the sender has - a developer machine with Wi-Fi, Ethernet,
// Docker and a VM adapter can produce 15-20 per connection on its own. The third
// person to join negotiates with everyone at once, so the burst is that figure
// times the number of peers, all inside one second. A limit sized for a single
// connection would throttle exactly the case this is meant to support.
//
// Still small enough to stop abuse: a flood looks like thousands, not hundreds.
const MAX_SIGNALS_PER_SECOND = 200;

// Mesh cost grows with the square of the call: at 3 people each browser holds 2
// connections and uploads 2 copies of one voice; at 6 it would hold 5. The
// room's 3 seats already imply this cap, so today it is unreachable - it is
// written down so that raising the seat count cannot quietly turn voice into a
// bandwidth problem.
const MAX_VOICE_PEERS = 3;

const withinSignalRate = (socket, byteLength) => {
  if (byteLength > MAX_SIGNAL_BYTES) {
    console.warn(`Socket ${socket.id} sent an oversized voice signal (${byteLength} bytes)`);
    return false;
  }

  const now = Date.now();
  const bucket = socket.data.signalBucket;

  if (!bucket || now - bucket.startedAt >= 1000) {
    socket.data.signalBucket = { startedAt: now, count: 1 };
    return true;
  }

  bucket.count += 1;
  if (bucket.count > MAX_SIGNALS_PER_SECOND) {
    console.warn(`Socket ${socket.id} exceeded the voice signal rate limit`);
    return false;
  }
  return true;
};

const describePeer = (s) => ({
  socketId: s.id,
  userId: s.data.user.id,
  name: s.data.user.email,
  muted: Boolean(s.data.voice?.muted),
});

// fetchSockets() rather than reading io.sockets.sockets directly: it is the only
// form that still works once this runs behind more than one Node process.
const voiceSocketsIn = async (io, roomId) => {
  const sockets = await io.in(roomId).fetchSockets();
  return sockets.filter((s) => s.data.voice?.active);
};

// Broadcasts to the room that this socket is off the call. Safe to call twice,
// and safe to call from the disconnect handler.
const leaveVoice = (io, socket) => {
  if (!socket.data.voice?.active) return;

  socket.data.voice = { active: false, muted: false };

  const roomId = socket.data.roomId;
  if (!roomId) return;

  // io.to() rather than socket.to(): during a disconnect this socket has already
  // been removed from the room, and we want the surviving members to hear about
  // it either way. The leaver ignores news about itself.
  io.to(roomId).emit('voice:peer-left', { socketId: socket.id });
};

const registerVoiceHandlers = (io, socket) => {
  const user = socket.data.user;

  socket.on('voice:join', async (ack) => {
    const roomId = socket.data.roomId;
    if (!roomId) return ack?.({ ok: false, error: 'Join a room first' });
    if (socket.data.voice?.active) return ack?.({ ok: false, error: 'Already on the call' });

    // Claimed synchronously, before any await. Two people pressing join in the
    // same instant would otherwise each look the room up, each see a call with
    // nobody on it, and each conclude there was no one to connect to - leaving
    // two people on a call that never happens. Undone below if the claim turns
    // out to be invalid.
    socket.data.voice = { active: true, muted: false };

    try {
      const onCall = (await voiceSocketsIn(io, roomId)).filter((s) => s.id !== socket.id);

      // One voice tab per person. Two tabs of the same user would become peers
      // of each other, and the mic of one would feed the speakers of the other:
      // an echo loop that no amount of echo cancellation can help with, since
      // the two are genuinely separate clients.
      if (onCall.some((s) => s.data.user.id === user.id)) {
        socket.data.voice = { active: false, muted: false };
        return ack?.({ ok: false, error: 'Voice is already active in another tab' });
      }

      if (onCall.length >= MAX_VOICE_PEERS) {
        socket.data.voice = { active: false, muted: false };
        return ack?.({ ok: false, error: 'The call is full' });
      }

      socket.to(roomId).emit('voice:peer-joined', describePeer(socket));

      ack?.({ ok: true, self: socket.id, peers: onCall.map(describePeer) });
    } catch (err) {
      console.error('voice:join error:', err);
      socket.data.voice = { active: false, muted: false };
      ack?.({ ok: false, error: 'Could not join voice' });
    }
  });

  socket.on('voice:leave', () => leaveVoice(io, socket));

  // The relay. The server has no idea what an offer or a candidate contains and
  // does not need to - it only checks that the sender is on this room's call and
  // that the addressee is too.
  socket.on('voice:signal', async (payload) => {
    const roomId = socket.data.roomId;
    if (!roomId || !socket.data.voice?.active) return;
    if (!payload || typeof payload.to !== 'string' || !SIGNAL_KINDS.has(payload.kind)) return;

    let size;
    try {
      size = JSON.stringify(payload.data ?? null).length;
    } catch {
      return; // Not serialisable, so not something a peer sent.
    }
    if (!withinSignalRate(socket, size)) return;

    try {
      // Never trust payload.to. Without this check a member of one room could
      // address a socket in any other room on the server.
      const onCall = await voiceSocketsIn(io, roomId);
      if (!onCall.some((s) => s.id === payload.to)) return;

      io.to(payload.to).emit('voice:signal', {
        from: socket.id,
        kind: payload.kind,
        data: payload.data,
      });
    } catch (err) {
      console.error('voice:signal error:', err);
    }
  });

  socket.on('voice:state', ({ muted } = {}) => {
    const roomId = socket.data.roomId;
    if (!roomId || !socket.data.voice?.active) return;

    socket.data.voice.muted = Boolean(muted);
    socket.to(roomId).emit('voice:peer-state', {
      socketId: socket.id,
      muted: socket.data.voice.muted,
    });
  });

  // Leaving the room at all means leaving the call. The seat and Yjs cleanup
  // lives in socket/index.js; this only concerns the call.
  socket.on('disconnect', () => leaveVoice(io, socket));
};

module.exports = registerVoiceHandlers;
