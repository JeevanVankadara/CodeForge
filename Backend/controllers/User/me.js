const pool = require('../../config/db');

const me = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ message: 'Database error' });
  }
};

module.exports = me;
