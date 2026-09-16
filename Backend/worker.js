// The only process that starts containers.
//
// Run it alongside the API:  npm run worker
//
// It is deliberately stateless - no MySQL, no Y.Doc, no sockets. Everything it
// needs arrives in the job payload, which is what makes it safe to run several
// of these, or to move them to another machine, without touching the API.
//
// RUN_CONCURRENCY is the whole point of the queue: it is a hard ceiling on how
// many containers can exist at once. Job N+1 waits in Redis instead of piling
// onto the Docker daemon, so overload degrades into "slower" rather than "the
// laptop falls over".

const dotenv = require('dotenv');
dotenv.config();

const { Worker } = require('bullmq');
const { createRedis } = require('./config/redis');
const { QUEUE_NAME } = require('./services/runQueue');
const executeCode = require('./services/executeCode');

// 4 containers x 256m is 1GB of headroom. Lower it if your laptop complains.
const CONCURRENCY = Number(process.env.RUN_CONCURRENCY || 4);

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { language, code, input = '' } = job.data;
    const started = Date.now();

    // Anything executeCode throws is an infrastructure fault and marks the job
    // failed, which is what makes the retry in defaultJobOptions meaningful. A
    // program that crashes or times out comes back as a normal resolved result.
    const result = await executeCode({ language, code, input });

    console.log(
      `job ${job.id} ${language} exit=${result.exitCode} in ${Date.now() - started}ms`
    );
    return result;
  },
  {
    connection: createRedis(),
    concurrency: CONCURRENCY,
    // A job whose worker was killed mid-container must not stay "active"
    // forever; after this it is returned to the queue.
    lockDuration: 60000,
  }
);

worker.on('failed', (job, err) => {
  console.error(`job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('Worker error:', err.message);
});

console.log(`Run worker ready - queue "${QUEUE_NAME}", executor ${executeCode.executor}, concurrency ${CONCURRENCY}`);

// Let in-flight containers finish rather than orphaning them on Ctrl+C.
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} received - finishing active runs...`);
  try {
    await worker.close();
    console.log('Worker stopped');
  } catch (err) {
    console.error('Worker shutdown failed:', err.message);
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
