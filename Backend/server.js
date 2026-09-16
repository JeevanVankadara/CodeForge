const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
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
const { startWorker } = require('./worker');
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

const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

const port = process.env.PORT || 3000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, credentials: true }
});

registerSocketHandlers(io);

const worker = process.env.RUN_WORKER === 'true' ? startWorker() : null;

async function initDb() {
  await pool.query(UserTable);
  await pool.query(RoomsTable);
  await pool.query(ProblemsTable);
  await pool.query('UPDATE rooms SET language = $1 WHERE NOT (language = ANY($2))', ['cpp', supportedLanguages]);
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

  if (worker) await worker.close().catch(() => {});
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
    console.error('Database setup failed:', err.message || err.code || err.errors?.[0]?.message || err);
    process.exit(1);
  });