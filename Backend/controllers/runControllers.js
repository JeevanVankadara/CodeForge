const path = require('path');
const fs = require('fs/promises');
const { createLanguageObject } = require('../services/LanguageFactory');
const runInContainer = require('../services/CodeRunner');
const {randomUUID} = require('crypto');

const runController = async(req, res) => {
  const {language, code, input = ''} = req.body;
  if(!language || !code || typeof code !== 'string') {
    return res.status(400).json({error: 'Invalid request body'});
  }

  let runner;
  try{
    runner = createLanguageObject(language);
  }catch(err){
    return res.status(400).json({error: err.message});
  }

  const jobId = randomUUID();
  const jobDir = path.join(__dirname, '../temp', jobId);

   try {
    await fs.mkdir(jobDir, { recursive: true });
    await fs.writeFile(path.join(jobDir, runner.fileName), code);

    // Run it in Docker and capture the output.
    const result = await runInContainer(runner, jobDir, input);

    return res.status(200).json({
      output: result.stdout,
      error: result.stderr,
      exitCode: result.exitCode,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await fs.rm(jobDir, { recursive: true, force: true });
  }
};

module.exports = runController;