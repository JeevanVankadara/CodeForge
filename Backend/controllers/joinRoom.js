const { claimSeat } = require('../services/roomMembership');

// Enter a room and get its language + code so the frontend can load it.
// All the seat rules now live in services/roomMembership.js, shared with the
// socket layer - so a seat freed by a disconnect follows the exact same rules.
const joinRoom = async (req, res) => {
  const userId = Number(req.user.id);
  const roomId = req.params.id;

  try {
    const result = await claimSeat(roomId, userId);

    if (!result.ok) {
      return res.status(403).json({ error: 'Maximum size of room is reached' });
    }

    return res.status(200).json({
      id: roomId,
      language: result.room.language,
      code: result.room.code ?? '',
    });
  } catch (err) {
    console.error('joinRoom error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = joinRoom;
