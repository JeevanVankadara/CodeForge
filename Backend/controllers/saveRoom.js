const pool = require('../config/db');

// Saving the room's code (and language). Only members of the room may save.
const saveRoom = async (req, res) => {
  const userId = Number(req.user.id);
  const roomId = req.params.id;
  const { code = '', language } = req.body;

  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid code' });
  }

  try {
    const [rows] = await pool.promise().query(
      'SELECT user_created, user1, user2 FROM rooms WHERE id = ?',
      [roomId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const room = rows[0];

    const isMember =
      room.user_created === userId ||
      room.user1 === userId ||
      room.user2 === userId;
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this room' });
    }

    if (language) {
      await pool.promise().query(
        'UPDATE rooms SET code = ?, language = ? WHERE id = ?',
        [code, language, roomId]
      );
    } else {
      await pool.promise().query(
        'UPDATE rooms SET code = ? WHERE id = ?',
        [code, roomId]
      );
    }

    return res.status(200).json({ message: 'Saved' });
  } catch (err) {
    console.error('saveRoom error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = saveRoom;
