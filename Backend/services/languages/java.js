const BaseLanguage = require('./BaseLanguage');

class Java extends BaseLanguage {
  get image() { return 'codeforge-java'; }
  get fileName() { return 'Main.java'; }
  get compile() { return 'javac Main.java'; }
  get run() { return 'java Main'; }
}

module.exports = Java;
