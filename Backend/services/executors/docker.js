const path = require('path');
const { spawn } = require('child_process');
const { createJob, removeJob, execute, readResults, budgetMs } = require('./job');

const run = async (runner, code, inputs) => {
  const dir = await createJob(runner, code, inputs);
  const name = `cf-${path.basename(dir)}`;
  const args = [
    'run', '--rm', '--name', name,
    '--network', 'none', '--memory', '256m', '--cpus', '0.5', '--pids-limit', '64',
    '-v', `${dir}:/app`, '-w', '/app',
    runner.image, 'bash', 'run.sh',
  ];

  try {
    const { exitCode, stderr } = await execute('docker', args, {
      timeoutMs: budgetMs(inputs.length),
      onTimeout: (child) => {
        spawn('docker', ['kill', name]).on('error', () => {});
        child.kill();
      },
    });
    if (exitCode === 125) throw new Error(`Docker could not start the container: ${stderr.trim()}`);
    return await readResults(dir, inputs.length);
  } finally {
    await removeJob(dir);
  }
};

module.exports = { run };
