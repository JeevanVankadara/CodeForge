const Cpp = require('./languages/Cpp');
const Python = require('./languages/Python');
const Java = require('./languages/Java');

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