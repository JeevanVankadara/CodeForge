const pool = require('../config/db');

// FUTURE (sockets): right now this only runs when the frontend explicitly calls
// POST /rooms/:id/leave. It cannot detect a browser close/refresh or a dropped
// connection. When Socket.IO is added, the 'disconnect' event should call this
// same slot-clearing logic so a user who goes offline frees their seat automatically.
const leaveRoom = async (req, res) => {
  const userId = Number(req.user.id);
  const roomId = req.params.id;

  try {
    const [rows] = await pool.promise().query(
      'SELECT user1, user2 FROM rooms WHERE id = ?',
      [roomId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const room = rows[0];

    let slot = null;
    if (room.user1 === userId) slot = 'user1';
    else if (room.user2 === userId) slot = 'user2';

    if (slot) {
      // slot is a fixed literal ('user1'/'user2'), never user input -> safe to interpolate.
      await pool.promise().query(
        `UPDATE rooms SET ${slot} = NULL WHERE id = ?`,
        [roomId]
      );
    }
    // If the user held no slot (e.g. only the creator), there is nothing to clear.

    return res.status(200).json({ message: 'Left room' });
  } catch (err) {
    console.error('leaveRoom error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = leaveRoom;
