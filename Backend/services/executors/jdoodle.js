const { createHash } = require('crypto');
const { UnrecoverableError } = require('bullmq');
const { createRedis } = require('../../config/redis');

const API_URL = 'https://api.jdoodle.com/v1/execute';
const TIMEOUT_MS = 20000;
const CACHE_SECONDS = 24 * 60 * 60;

const clientId = process.env.JDOODLE_CLIENT_ID;
const clientSecret = process.env.JDOODLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  throw new Error('JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET must be set');
}

const redis = createRedis();

const cacheKey = (runner, code, input) =>
  'jdoodle:' + createHash('sha256').update(`${runner.jdoodle.language}\n${code}\n${input}`).digest('hex');

const run = async (runner, code, input) => {
  const key = cacheKey(runner, code, input);
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      clientSecret,
      script: code,
      stdin: input,
      language: runner.jdoodle.language,
      versionIndex: runner.jdoodle.versionIndex,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (res.status === 429) throw new UnrecoverableError('Daily run limit reached - resets at 23:55 UTC');
  if (res.status === 401) throw new UnrecoverableError('JDoodle credentials were rejected');
  if (!res.ok) throw new Error(`JDoodle responded with ${res.status}`);

  const data = await res.json();
  const failed = data.isCompiled === false || data.isExecutionSuccess === false;
  const result = {
    stdout: failed ? '' : data.output || '',
    stderr: failed ? data.output || '' : '',
    exitCode: failed ? 1 : 0,
  };

  await redis.set(key, JSON.stringify(result), 'EX', CACHE_SECONDS);
  return result;
};

module.exports = { run };
