const { createJob, removeJob, execute, readResults, budgetMs } = require('./job');

const killTree = (child) => {
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
};

const run = async (runner, code, inputs) => {
  const dir = await createJob(runner, code, inputs);
  try {
    await execute('bash', ['run.sh'], { cwd: dir, timeoutMs: budgetMs(inputs.length), onTimeout: killTree });
    return await readResults(dir, inputs.length);
  } finally {
    await removeJob(dir);
  }
};

module.exports = { run };
