const BaseLanguage = require('./BaseLanguage');

class Java extends BaseLanguage {
  get image() { return 'codeforge-java'; }
  get fileName() { return 'Main.java'; }
  getRunCommand() { return 'javac Main.java && java Main'; }
}

module.exports = Java;
