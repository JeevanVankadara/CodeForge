// Room-wide "shared run": one member presses Run, everybody sees the same output.
//
// Three rules make this safe:
//   1. Only one run per room at a time, enforced by a lock in YRoomManager. The
//      lock is now held across the queue wait too, not just the container, or a
//      room could stack up several queued jobs.
//   2. The code that runs is the SERVER's document, never the payload a client
//      sent. Otherwise a member could execute something nobody else can see.
//   3. That document is snapshotted into the job at enqueue time. The worker is
//      handed the code itself, so collaborators typing while the job waits in the
//      queue cannot change what actually runs.

const { enqueueRun, waitForRun } = require('../services/runQueue');
const { getRoom, acquireRunLock, releaseRunLock } = require('../services/YRoomManager');

const registerRunHandlers = (io, socket) => {
  const user = socket.data.user;

  socket.on('run:start', async ({ input = '' } = {}, ack) => {
    const roomId = socket.data.roomId;
    if (!roomId) return ack?.({ ok: false, error: 'Join a room first' });

    let locked;
    try {
      await getRoom(roomId);
      locked = await acquireRunLock(roomId, user);
    } catch (err) {
      console.error('run:start error:', err);
      return ack?.({ ok: false, error: 'Could not start the run' });
    }

    if (!locked.ok) return ack?.({ ok: false, error: locked.error });

    const state = locked.state;
    const code = state.ytext.toString();
    const language = state.ymeta.get('language') || 'cpp';

    if (!code.trim()) {
      releaseRunLock(state);
      return ack?.({ ok: false, error: 'There is no code to run' });
    }

    let job;
    let position;
    try {
      ({ job, position } = await enqueueRun({
        language,
        code,
        input,
        roomId,
        userId: user.id,
      }));
    } catch (err) {
      // Nothing was queued, so the room must not stay locked.
      releaseRunLock(state);
      return ack?.({ ok: false, error: err.message || 'Could not queue the run' });
    }

    ack?.({ ok: true });

    // Emitted as soon as the job is accepted so the UI reacts immediately.
    // `queued` is how many runs are ahead of this one - 0 means it starts now.
    io.to(roomId).emit('run:started', {
      by: user.id,
      name: user.email,
      language,
      queued: position,
    });

    try {
      const result = await waitForRun(job);

      io.to(roomId).emit('run:output', {
        by: user.id,
        name: user.email,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode,
      });
    } catch (err) {
      io.to(roomId).emit('run:output', {
        by: user.id,
        name: user.email,
        stdout: '',
        stderr: err.message || 'Run failed',
        exitCode: -1,
      });
    } finally {
      // Freeing the lock matters more than the broadcast: without it the room
      // could never run anything again.
      releaseRunLock(state);
      io.to(roomId).emit('run:idle');
    }
  });
};

module.exports = registerRunHandlers;
