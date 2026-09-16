const bcrypt = require('bcrypt');
const generateToken = require('../../util/jwt');
const { setAuthCookie } = require('../../util/authCookie');
const pool = require('../../config/db');

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email });
    setAuthCookie(res, token);
    return res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Database error' });
  }
};

module.exports = login;
