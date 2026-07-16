const bcrypt = require('bcrypt');
const generateToken = require('../../utils/generateToken');
const pool = require('../../config/db');

const signup = async(req, res) => {
  const {name, email, password} = req.body;

  let sql = `SELECT id from users WHERE email = ?`;

  pool.query(sql, [email], async(err, result) => {
    if(err) {
      return res.status(500).json({message: 'Database error', error: err});
    }
    if(result.length > 0) {
      return res.status(400).json({message: 'Email already used'});
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    sql = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;

    pool.query(sql, [name, email, hashedPassword], (err, result) => {
      if(err) {
        return res.status(500).json({message: 'Database error', error: err});
      }
      const token = generateToken({id: result.insertId, email});
      res.status(201).json({message: 'User created successfully', token});
    });
    
  });
};

module.exports = signup;