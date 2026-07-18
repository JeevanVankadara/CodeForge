const Cpp = require('./languages/cpp');
const Python = require('./languages/python');
const Java = require('./languages/java');

const registry = {
  cpp: Cpp,
  python: Python,
  java: Java,
};

function createLanguageObject(language){
  const key = String(language || '').toLowerCase();
  if(!registry[key]){
    throw new Error(`Language ${language} is not supported`);
  }
  return new registry[key]();
}

module.exports = {
  createLanguageObject,
  supportedLanguages: Object.keys(registry)
}