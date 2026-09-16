const createId = require('../util/creatingId');
const pool = require('../config/db');

const assigningUserToLink = async (req, res) => {
  const linkId = createId();
  try {
    await pool.query(
      `INSERT INTO rooms (id, user_created, language, code) VALUES ($1, $2, 'cpp', '')`,
      [linkId, req.user.id]
    );
    return res.status(201).json({ linkId });
  } catch (err) {
    console.error('Error inserting into rooms table:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = assigningUserToLink;
