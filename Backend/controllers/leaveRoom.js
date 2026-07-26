const { findRoom, releaseSeat } = require('../services/roomMembership');

// Explicit "leave" button. The socket 'disconnect' handler calls releaseSeat()
// too, so an unexpected drop and a deliberate exit clean up identically.
const leaveRoom = async (req, res) => {
  const userId = Number(req.user.id);
  const roomId = req.params.id;

  try {
    const room = await findRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    await releaseSeat(roomId, userId);

    return res.status(200).json({ message: 'Left room' });
  } catch (err) {
    console.error('leaveRoom error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = leaveRoom;
