// Producer side of the run queue.
//
// The API process no longer starts containers. It writes a self-contained job
// into Redis and waits for a worker to hand back the result.
//
// "Self-contained" is the important word: the job carries the *code itself*,
// snapshotted at the moment Run was pressed. It must not carry only a roomId for
// the worker to look up, because
//   1. MySQL trails the live Y.Doc by up to AUTOSAVE_MS, so the worker would run
//      stale code, and
//   2. collaborators keep typing while a job waits in the queue, so a lookup at
//      execution time would run a document state nobody ever saw.

const { Queue, QueueEvents } = require('bullmq');
const { createRedis } = require('../config/redis');
const { supportedLanguages } = require('./LanguageFactory');

const QUEUE_NAME = 'run';

// A real snippet is a few KB. Anything past this is a bug or abuse, and it would
// sit in Redis (i.e. in RAM) until the job is evicted.
const MAX_CODE_BYTES = 256 * 1024;
const MAX_INPUT_BYTES = 64 * 1024;

// Ceiling on the *total* wait: queue time plus container time. Distinct from the
// container's own limit in executors/docker.js, which bounds how long the user's program
// may run. This one bounds how long a human stares at a spinner.
const RUN_WAIT_MS = Number(process.env.RUN_WAIT_MS || 60000);

const queue = new Queue(QUEUE_NAME, {
  connection: createRedis(),
  defaultJobOptions: {
    // Retries exist for infrastructure faults only - a dead Docker daemon, a
    // missing image. A program that segfaults is a *successful* job with a
    // non-zero exit code, and the executor resolves rather than throws for it, so
    // user code never burns an attempt.
    attempts: 2,
    backoff: { type: 'fixed', delay: 500 },
    // Finished jobs are evicted, otherwise Redis grows forever.
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

const queueEvents = new QueueEvents(QUEUE_NAME, { connection: createRedis() });

// waitUntilFinished registers one listener per in-flight job on this shared
// emitter, so the default ceiling of 10 would print a spurious leak warning as
// soon as 11 people run at once.
queueEvents.setMaxListeners(0);

queueEvents.on('error', (err) => {
  console.error('Run queue events error:', err.message);
});

// Resolves to { job, position } where position is how many runs are already
// waiting ahead of this one - 0 means it should start immediately.
const enqueueRun = async ({ language, code, input = '', roomId = null, userId = null }) => {
  // Checked here rather than in the worker: an unsupported language is a bad
  // request, and it should be rejected in the caller's face instead of taking up
  // a queue slot and failing two attempts later.
  if (!supportedLanguages.includes(String(language || '').toLowerCase())) {
    throw new Error(`Language ${language} is not supported`);
  }
  if (typeof code !== 'string' || !code.trim()) {
    throw new Error('There is no code to run');
  }
  if (Buffer.byteLength(code) > MAX_CODE_BYTES) {
    throw new Error('That file is too large to run');
  }
  if (Buffer.byteLength(String(input)) > MAX_INPUT_BYTES) {
    throw new Error('That input is too large');
  }

  const job = await queue.add('run', { language, code, input, roomId, userId });

  // Best-effort: a queue depth reading is for the UI, never worth failing on.
  let position = 0;
  try {
    position = await queue.getWaitingCount();
  } catch {
    position = 0;
  }

  return { job, position };
};

// Blocks until the worker finishes the job, then returns its result.
//
// Throws when the run could not be *carried out* - no worker running, Docker
// down, or the total wait ceiling hit. It does not throw for a program that
// merely failed, which comes back as a normal result with a non-zero exitCode.
const waitForRun = async (job) => {
  try {
    return await job.waitUntilFinished(queueEvents, RUN_WAIT_MS);
  } catch (err) {
    if (/timed out|timeout/i.test(err.message)) {
      throw new Error('The server is busy right now - please try again');
    }
    throw err;
  }
};

const closeQueue = async () => {
  await Promise.allSettled([queue.close(), queueEvents.close()]);
};

module.exports = {
  QUEUE_NAME,
  RUN_WAIT_MS,
  MAX_CODE_BYTES,
  queue,
  queueEvents,
  enqueueRun,
  waitForRun,
  closeQueue,
};
