const BaseLanguage = require('./BaseLanguage');

class Python extends BaseLanguage {
  get image() { return 'codeforge-python'; }
  get fileName() { return 'main.py'; }
  get jdoodle() { return { language: 'python3', versionIndex: '5' }; }
  getRunCommand() { return 'python3 main.py'; }
}

module.exports = Python;
