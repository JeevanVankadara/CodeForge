// HTTP entry point for the plain compiler page (no room, no collaboration).
//
// This process never starts a container any more: it puts a job on the queue and
// waits for a worker to finish it. The request still blocks, but it now blocks
// on Redis rather than on a container, so a hundred simultaneous requests cost a
// hundred cheap waits instead of a hundred containers.

const { enqueueRun, waitForRun } = require('../services/runQueue');

const runController = async (req, res) => {
  const { language, code, input = '' } = req.body;

  if (!language || !code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  let job;
  try {
    ({ job } = await enqueueRun({ language, code, input }));
  } catch (error) {
    // enqueueRun rejects unsupported languages and oversized payloads.
    return res.status(400).json({ error: error.message });
  }

  try {
    const result = await waitForRun(job);

    return res.status(200).json({
      output: result.stdout,
      error: result.stderr,
      exitCode: result.exitCode,
    });
  } catch (error) {
    // Getting here means the run could not be carried out at all - no worker,
    // Docker down, or the total wait ceiling was hit. A program that merely
    // crashed came back above with a non-zero exitCode.
    console.error('runController error:', error.message);
    return res.status(503).json({ error: error.message || 'Could not run the code' });
  }
};

module.exports = runController;
