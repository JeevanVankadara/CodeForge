const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const url = process.env.DATABASE_URL || '';
const local = /localhost|127\.0\.0\.1|sslmode=disable/.test(url);

const pool = new Pool({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Postgres pool error:', err.message);
});

module.exports = pool;
