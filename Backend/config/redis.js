// Redis connections for the BullMQ run queue.
//
// Every BullMQ primitive (Queue, Worker, QueueEvents) wants its own connection
// because Workers and QueueEvents issue *blocking* commands that monopolise a
// connection for seconds at a time.

const IORedis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// maxRetriesPerRequest must be null for BullMQ. ioredis defaults to giving up on
// a command after 20 retries, which would abort the long blocking reads a Worker
// lives on and make it look like the worker had silently died.
const createRedis = () => {
  const conn = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  // ioredis reconnects on its own, but an unhandled 'error' event prints a
  // stack trace per attempt. One readable line is enough while Redis is down.
  conn.on('error', (err) => {
    console.error(`Redis (${REDIS_URL}): ${err.message}`);
  });

  return conn;
};

module.exports = { createRedis, REDIS_URL };
