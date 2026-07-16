const createId = require('../util/creatingId');
const pool = require('../config/db');

const assigningUserToLink = (req, res, next) => {
  const userId = req.user.id;
  const linkId = createId();
  pool.query(
    `INSERT INTO rooms (user_created, id) VALUES (?, ?)`, [userId, linkId], (err, result) => {
      if (err) {
        console.error('Error inserting into rooms table:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      return res.status(201).json({ linkId });  
  });
};

module.exports = assigningUserToLink;