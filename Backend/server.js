const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');

dotenv.config();

const pool = require('./config/db');
const { UserTable, RoomsTable, ProblemsTable } = require('./db/schema');
const registerSocketHandlers = require('./socket');
const { startAutosave, stopAutosave, flushAll } = require('./services/YRoomManager');
const { closeQueue } = require('./services/runQueue');
const { supportedLanguages } = require('./services/LanguageFactory');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
// Duriong the production only
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true
}));

app.use(express.json()); // middleware to parse incoming JSON requests
app.use(cookieParser()); // reads cookies into req.cookies (e.g. the auth token)

app.use('/auth', require('./routes/authRoutes'));
app.use('/rooms', require('./routes/roomsRoutes'));
app.use('/run', require('./routes/runRoutes'));
app.use('/rtc', require('./routes/rtcRoutes'));
app.use('/problems', require('./routes/problemsRoutes'));

const port = process.env.PORT || 3000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, credentials: true }
});

registerSocketHandlers(io);

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

// Widens an existing column when its type is no longer big enough.
// (ensureColumn only ever ADDs, so it can't fix a column that already exists.)
async function ensureColumnType(table, column, expectedType, definition) {
  const [rows] = await pool.promise().query(
    `SELECT data_type AS t FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  if (rows.length && String(rows[0].t).toLowerCase() !== expectedType) {
    await pool.promise().query(`ALTER TABLE ${table} MODIFY ${column} ${definition}`);
    console.log(`Migration: widened ${table}.${column} to ${expectedType}`);
  }
}

async function initDb() {
  await pool.promise().query(UserTable);
  await pool.promise().query(RoomsTable);
  await pool.promise().query(ProblemsTable);
  await ensureColumn('rooms', 'language', "VARCHAR(20) NOT NULL DEFAULT 'cpp'");
  await ensureColumn('rooms', 'code', "MEDIUMTEXT NULL");
  await ensureColumn('rooms', 'updated_at',
    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  await ensureColumn('rooms', 'ydoc_state', "MEDIUMBLOB NULL");

  // A plain BLOB/TEXT tops out at 64KB. A Yjs snapshot keeps edit history, so a
  // real session outgrows that quickly and the save would fail. MEDIUM* is 16MB.
  await ensureColumnType('rooms', 'ydoc_state', 'mediumblob', 'MEDIUMBLOB NULL');
  await ensureColumnType('rooms', 'code', 'mediumtext', 'MEDIUMTEXT NULL');

  await pool.promise().query(
    'UPDATE rooms SET language = ? WHERE language NOT IN (?)',
    ['cpp', supportedLanguages]
  );

  console.log('Database tables are ready');
}

app.get('/health', (req, res) => {
  res.status(200).json('Server is running fine');
});

// Ctrl+C or a container stop must not throw away up to 15 seconds of typing,
// so every open room is written before the process exits.
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} received - saving open rooms...`);
  stopAutosave();

  try {
    await flushAll();
    console.log('All open rooms saved');
  } catch (err) {
    console.error('Shutdown save failed:', err.message);
  }

  // Releases the Redis connections so the process can actually exit.
  await closeQueue();

  io.close();
  httpServer.close(() => process.exit(0));

  // Don't hang forever on a socket that refuses to close.
  setTimeout(() => process.exit(0), 5000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

initDb()
  .then(() => {
    startAutosave();
    httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Socket.IO ready, accepting connections from ${CLIENT_ORIGIN}`);
    });
  })
  .catch((err) => {
    console.error('Database setup failed:', err.message);
    process.exit(1);
  });