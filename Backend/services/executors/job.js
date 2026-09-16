const path = require('path');
const fs = require('fs/promises');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');

const TIME_LIMIT_S = Number(process.env.RUN_TIME_LIMIT_S || 10);
const COMPILE_LIMIT_S = Number(process.env.COMPILE_LIMIT_S || 60);
const MAX_OUTPUT_BYTES = 64 * 1024;
const ROOT = path.join(__dirname, '../../temp');

const script = (runner, count) => {
  const lines = [];
  if (runner.compile) {
    lines.push(
      `timeout -k 1 ${COMPILE_LIMIT_S} ${runner.compile} > compile.txt 2>&1`,
      'echo $? > compile.code',
      '[ "$(cat compile.code)" = "0" ] || exit 0'
    );
  }
  for (let i = 0; i < count; i++) {
    lines.push(
      `timeout -k 1 ${TIME_LIMIT_S} ${runner.run} < in${i}.txt 2> err${i}.txt | head -c ${MAX_OUTPUT_BYTES} > out${i}.txt`,
      `echo \${PIPESTATUS[0]} > code${i}.txt`
    );
  }
  return lines.join('\n') + '\n';
};

const createJob = async (runner, code, inputs) => {
  const dir = path.join(ROOT, randomUUID());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, runner.fileName), code);
  await Promise.all(inputs.map((input, i) => fs.writeFile(path.join(dir, `in${i}.txt`), input)));
  await fs.writeFile(path.join(dir, 'run.sh'), script(runner, inputs.length));
  return dir;
};

const removeJob = (dir) => fs.rm(dir, { recursive: true, force: true });

const budgetMs = (count) => (COMPILE_LIMIT_S + count * (TIME_LIMIT_S + 1) + 5) * 1000;

const execute = (cmd, args, { cwd, timeoutMs, onTimeout }) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, detached: process.platform !== 'win32' });
    let stderr = '';
    child.stdout.on('data', () => {});
    child.stderr.on('data', (chunk) => (stderr += chunk));

    const timer = setTimeout(() => onTimeout(child), timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start ${cmd}: ${err.message}`));
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stderr });
    });
  });

const read = async (dir, name) => {
  try {
    return await fs.readFile(path.join(dir, name), 'utf8');
  } catch {
    return null;
  }
};

const truncate = (text) =>
  Buffer.byteLength(text) > MAX_OUTPUT_BYTES
    ? Buffer.from(text).subarray(0, MAX_OUTPUT_BYTES).toString() + '\n...output truncated'
    : text;

const TIMED_OUT = { stdout: '', stderr: 'Time limit exceeded', exitCode: -1 };

const readResults = async (dir, count) => {
  const compileCode = await read(dir, 'compile.code');
  if (compileCode !== null && compileCode.trim() !== '0') {
    const stderr = truncate((await read(dir, 'compile.txt')) || '');
    return Array.from({ length: count }, () => ({ stdout: '', stderr, exitCode: Number(compileCode) }));
  }

  const results = [];
  for (let i = 0; i < count; i++) {
    const code = await read(dir, `code${i}.txt`);
    if (code === null) {
      results.push(TIMED_OUT);
      continue;
    }
    let stdout = (await read(dir, `out${i}.txt`)) || '';
    let stderr = truncate((await read(dir, `err${i}.txt`)) || '').split(`${dir}/`).join('');
    let exitCode = Number(code);

    if (exitCode === 124) {
      exitCode = -1;
      stderr = stderr ? `${stderr}\nTime limit exceeded` : 'Time limit exceeded';
    } else if (Buffer.byteLength(stdout) >= MAX_OUTPUT_BYTES) {
      stdout += '\n...output truncated';
      stderr = '';
      exitCode = 0;
    }
    results.push({ stdout, stderr, exitCode });
  }
  return results;
};

module.exports = { createJob, removeJob, execute, readResults, budgetMs, TIME_LIMIT_S, MAX_OUTPUT_BYTES };
