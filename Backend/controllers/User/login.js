const bcrypt = require('bcrypt');
const generateToken = require('../../utils/generateToken');
const pool = require('../../config/db');

const login = async(req, res) => {
  const {email, password} = req.body;

  let sql = `SELECT * from users WHERE email = ?`;

  pool.query(sql, [email], async(err, result) => {
    if(err) {
      return res.status(500).json({message: 'Database error', error: err});
    }
    if(result.length === 0) {
      return res.status(400).json({message: 'Invalid email or password'});
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch) {
      return res.status(400).json({message: 'Invalid email or password'});
    }

    const token = generateToken({id: user.id, email: user.email});
    res.status(200).json({message: 'Login successful', token});
  });
};

module.exports = login;