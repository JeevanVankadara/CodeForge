const BaseLanguage = require('./BaseLanguage');

class Cpp extends BaseLanguage {
  get image() {return 'codeforge-cpp';}
  get fileName() {return 'main.cpp';}
  get jdoodle() {return { language: 'cpp17', versionIndex: '2' };}
  getRunCommand(){return 'g++ -std=c++17 main.cpp -o main && ./main';}
}

module.exports = Cpp;
