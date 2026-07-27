// HTTP entry point for the plain compiler page (no room, no collaboration).
// The sandboxing itself lives in services/executeCode.js, which the room-wide
// shared run reuses, so both paths behave identically.

const executeCode = require('../services/executeCode');

const runController = async (req, res) => {
  const { language, code, input = '' } = req.body;

  if (!language || !code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    const result = await executeCode({ language, code, input });

    return res.status(200).json({
      output: result.stdout,
      error: result.stderr,
      exitCode: result.exitCode,
    });
  } catch (error) {
    // createLanguageObject throws for anything outside the registry.
    if (/not supported/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('runController error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = runController;
