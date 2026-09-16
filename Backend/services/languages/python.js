const BaseLanguage = require('./BaseLanguage');

class Python extends BaseLanguage {
  get image() { return 'codeforge-python'; }
  get fileName() { return 'main.py'; }
  get run() { return 'python3 main.py'; }
}

module.exports = Python;
