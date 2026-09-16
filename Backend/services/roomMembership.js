const db = require('../config/db.js');

const findRoom = async(roomId) => {
  const { rows } = await db.query(
    `SELECT id, user_created, user1, user2, language, code FROM rooms WHERE id = $1`,
    [roomId]
  );
  return rows[0] || null;
};

const seatOf = (room, userId)=> {
  if(!room) return null;
  if(room.user_created === userId) return 'user_created';
  if(room.user1 === userId) return 'user1';
  if(room.user2 === userId) return 'user2';
  return null;
};

const isMember = (room, userId) => seatOf(room, userId) !== null;

const createRoom = async (roomId, userId) => {
  try {
    await db.query(
      `INSERT INTO rooms (id, user_created, language, code) VALUES ($1, $2, 'cpp', '')`,
      [roomId, userId]
    );
  } catch (err) {
    if (err.code !== '23505') throw err;
  }
  return findRoom(roomId);
};

const claimSeat = async (roomId, userId) => {
  let room = await findRoom(roomId);
  if (!room) room = await createRoom(roomId, userId);

  const existing = seatOf(room, userId);
  if (existing) return { ok: true, seat: existing, room };

  for (const slot of ['user1', 'user2']) {
    const { rowCount } = await db.query(
      `UPDATE rooms SET ${slot} = $1 WHERE id = $2 AND ${slot} IS NULL`,
      [userId, roomId]
    );
    if (rowCount === 1) {
      return { ok: true, seat: slot, room: { ...room, [slot]: userId } };
    }
  }

  return { ok: false, reason: 'ROOM_FULL', room };
};

const releaseSeat = async (roomId, userId) => {
  for (const slot of ['user1', 'user2']) {
    const { rowCount } = await db.query(
      `UPDATE rooms SET ${slot} = NULL WHERE id = $1 AND ${slot} = $2`,
      [roomId, userId]
    );
    if (rowCount === 1) return slot;
  }
  return null;
};

module.exports = { findRoom, seatOf, isMember, claimSeat, releaseSeat };