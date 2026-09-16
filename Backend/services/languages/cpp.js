const BaseLanguage = require('./BaseLanguage');

class Cpp extends BaseLanguage {
  get image() { return 'codeforge-cpp'; }
  get fileName() { return 'main.cpp'; }
  get compile() { return 'g++ -std=c++17 main.cpp -o main'; }
  get run() { return './main'; }
}

module.exports = Cpp;
