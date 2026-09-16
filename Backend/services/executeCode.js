const { createLanguageObject } = require('./LanguageFactory');

const executor = process.env.EXECUTOR || 'docker';
const { run } = require(`./executors/${executor}`);

const executeCode = ({ language, code, inputs = [''] }) => run(createLanguageObject(language), code, inputs);

module.exports = executeCode;
module.exports.executor = executor;
