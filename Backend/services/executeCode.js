// Runs one snippet inside a throwaway Docker container and returns its output.
//
// Shared by two callers: the plain HTTP /run route (compiler page) and the
// room-wide "shared run" socket handler. Keeping it in one place means both
// paths get identical sandboxing, timeouts and temp-directory cleanup.

const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');
const { createLanguageObject } = require('./LanguageFactory');
const runInContainer = require('./CodeRunner');

// Throws if the language is unsupported; resolves to { stdout, stderr, exitCode }.
const executeCode = async ({ language, code, input = '' }) => {
  const runner = createLanguageObject(language);

  const jobId = randomUUID();
  const jobDir = path.join(__dirname, '../temp', jobId);

  try {
    await fs.mkdir(jobDir, { recursive: true });
    await fs.writeFile(path.join(jobDir, runner.fileName), code);
    return await runInContainer(runner, jobDir, input);
  } finally {
    // Always clean up, even when the container errored or timed out.
    await fs.rm(jobDir, { recursive: true, force: true });
  }
};

module.exports = executeCode;
