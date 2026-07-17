const BaseLanguage = require('./BaseLanguage');

class Python extends BaseLanguage {
  get image() { return 'codeforge-python'; }
  get fileName() { return 'main.py'; }
  getRunCommand() { return 'python3 main.py'; }
}

module.exports = Python;
