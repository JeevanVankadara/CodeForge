const pool = require('../../config/db');

// Returns the currently logged-in user (identified by the auth cookie).
// The JWT only carries id/email, so we read the name from the DB.
const me = (req, res) => {
  const userId = req.user.id;
  pool.query('SELECT id, name, email FROM users WHERE id = ?', [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json(rows[0]);
  });
};

module.exports = me;
