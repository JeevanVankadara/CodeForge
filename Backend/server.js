const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const pool = require('./config/db');
const { UserTable, RoomsTable } = require('./db/schema');


const app = express();
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));

app.use(express.json()); // middleware to parse incoming JSON requests

app.use('/auth', require('./routes/authRoutes'));
app.use('/rooms', require('./routes/roomsRoutes'));
app.use('/run', require('./routes/runRoutes'));

const port = process.env.PORT || 3000;

// Adds a column only if it is missing, so existing tables get upgraded safely.
// (Plain "CREATE TABLE IF NOT EXISTS" never alters a table that already exists.)
async function ensureColumn(table, column, definition) {
  const [rows] = await pool.promise().query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  if (rows[0].c === 0) {
    await pool.promise().query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Migration: added column ${table}.${column}`);
  }
}

async function initDb() {
  await pool.promise().query(UserTable);
  await pool.promise().query(RoomsTable);

  // Upgrade older rooms tables that predate these columns.
  await ensureColumn('rooms', 'language', "VARCHAR(20) NOT NULL DEFAULT 'cpp'");
  await ensureColumn('rooms', 'code', "TEXT NULL");
  await ensureColumn('rooms', 'updated_at',
    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  console.log('Database tables are ready');
}

initDb().catch((err) => {
  console.error('Database setup failed:', err.message);
  process.exit(1);
});

app.get('/health', (req, res) => {
  res.status(200).json('Server is running fine');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});