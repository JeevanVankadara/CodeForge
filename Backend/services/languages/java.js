const BaseLanguage = require('./BaseLanguage');

class Java extends BaseLanguage {
  get image() { return 'codeforge-java'; }
  get fileName() { return 'Main.java'; }
  get compile() { return 'javac -J-XX:TieredStopAtLevel=1 -J-XX:+UseSerialGC -J-XX:SharedArchiveFile=/opt/javac.jsa Main.java'; }
  get run() { return 'java -XX:TieredStopAtLevel=1 -XX:+UseSerialGC Main'; }
}

module.exports = Java;
