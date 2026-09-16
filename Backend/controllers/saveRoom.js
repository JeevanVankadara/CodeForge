// The Save button. Only members of the room may save.
//
// When the room is live (someone is connected), the server's Y.Doc is the truth
// and gets written - not the text in the request. Two people editing means the
// caller's copy is already a moment out of date, and trusting it would undo
// whatever the others typed in between. The body is only used as a fallback for
// a room with no live document, e.g. saving right after a server restart.

const pool = require('../config/db');
const { persistRoomById } = require('../services/YRoomManager');
const { supportedLanguages } = require('../services/LanguageFactory');

const saveRoom = async (req, res) => {
  const userId = Number(req.user.id);
  const roomId = req.params.id;
  const { code = '', language } = req.body;

  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid code' });
  }
  if (language && !supportedLanguages.includes(language)) {
    return res.status(400).json({ error: `Language ${language} is not supported` });
  }

  try {
    const { rows } = await pool.query(
      'SELECT user_created, user1, user2 FROM rooms WHERE id = $1',
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

    // Live room -> save the shared document, code + language + CRDT snapshot.
    const savedFromMemory = await persistRoomById(roomId);
    if (savedFromMemory) {
      return res.status(200).json({ message: 'Saved' });
    }

    if (language) {
      await pool.query(
        'UPDATE rooms SET code = $1, language = $2, updated_at = NOW() WHERE id = $3',
        [code, language, roomId]
      );
    } else {
      await pool.query(
        'UPDATE rooms SET code = $1, updated_at = NOW() WHERE id = $2',
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
