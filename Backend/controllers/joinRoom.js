const pool = require('../config/db');

// Enter a room. Rules:
//   - creator (user_created) and existing slot holders (user1/user2) are let in as-is
//   - a new person takes the first empty slot: user1, then user2
//   - if both slots are taken by others and you are not the creator -> room is full
// Returns the room's language + code so the frontend can load it.
const joinRoom = async (req, res) => {
  const userId = Number(req.user.id);
  const roomId = req.params.id;

  try {
    const [rows] = await pool.promise().query(
      'SELECT id, user_created, user1, user2, language, code FROM rooms WHERE id = ?',
      [roomId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const room = rows[0];

    const alreadyMember =
      room.user_created === userId ||
      room.user1 === userId ||
      room.user2 === userId;

    if (!alreadyMember) {
      let slot;
      if (room.user1 === null) slot = 'user1';
      else if (room.user2 === null) slot = 'user2';
      else {
        return res.status(403).json({ error: 'Maximum size of room is reached' });
      }
      await pool.promise().query(
        `UPDATE rooms SET ${slot} = ? WHERE id = ?`,
        [userId, roomId]
      );
    }

    return res.status(200).json({
      id: room.id,
      language: room.language,
      code: room.code ?? '',
    });
  } catch (err) {
    console.error('joinRoom error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = joinRoom;
