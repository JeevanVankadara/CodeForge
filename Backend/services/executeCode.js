const { createLanguageObject } = require('./LanguageFactory');

const executor = process.env.EXECUTOR || (process.env.NODE_ENV === 'production' ? 'jdoodle' : 'docker');
const { run } = require(`./executors/${executor}`);

const executeCode = ({ language, code, input = '' }) => run(createLanguageObject(language), code, input);

module.exports = executeCode;
module.exports.executor = executor;
