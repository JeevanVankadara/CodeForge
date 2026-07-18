const pool = require('../config/db');

// Enter a room and get its language + code so the frontend can load it.
// If the room id doesn't exist yet, it is created with the current user as creator
// (this is how "Create Session" / opening a fresh link makes a room).
// Membership rules for an existing room:
//   - creator (user_created) and current slot holders (user1/user2) are let in as-is
//   - a new person takes the first empty slot: user1, then user2
//   - both slots taken by others and you are not the creator -> room is full
const joinRoom = async (req, res) => {
  const userId = Number(req.user.id);
  const roomId = req.params.id;

  try {
    let [rows] = await pool.promise().query(
      'SELECT id, user_created, user1, user2, language, code FROM rooms WHERE id = ?',
      [roomId]
    );

    // Room doesn't exist -> create it with this user as the creator.
    if (rows.length === 0) {
      await pool.promise().query(
        `INSERT INTO rooms (id, user_created, language, code) VALUES (?, ?, 'cpp', '')`,
        [roomId, userId]
      );
      return res.status(200).json({ id: roomId, language: 'cpp', code: '' });
    }

    const room = rows[0];

    const alreadyMember =
      room.user_created === userId ||
      room.user1 === userId ||
      room.user2 === userId;

    if (!alreadyMember) {
      // Claim the first empty slot.
      // FUTURE (sockets): a slot frees up on leaveRoom; a 'disconnect' should do the same.
      let slot;
      if (room.user1 === null) slot = 'user1';
      else if (room.user2 === null) slot = 'user2';
      else {
        return res.status(403).json({ error: 'Maximum size of room is reached' });
      }
      // slot is a fixed literal ('user1'/'user2'), never user input -> safe to interpolate.
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
