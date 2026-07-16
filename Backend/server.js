const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const pool = require('./config/db');
const { UserTable, RoomsTable } = require('./db/schema');

const app = express();

app.use(express.json()); // middleware to parse incoming JSON requests

app.use('/auth', require('./routes/authRoutes'));
app.use('/rooms', require('./routes/roomsRoutes'));

const port = process.env.PORT || 3000;

async function initDb() {
  await pool.promise().query(UserTable);
  await pool.promise().query(RoomsTable);
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