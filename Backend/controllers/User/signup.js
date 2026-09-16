const bcrypt = require('bcrypt');
const generateToken = require('../../util/jwt');
const { setAuthCookie } = require('../../util/authCookie');
const pool = require('../../config/db');

const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already used' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hashedPassword]
    );

    const token = generateToken({ id: rows[0].id, email });
    setAuthCookie(res, token);
    return res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ message: 'Database error' });
  }
};

module.exports = signup;
