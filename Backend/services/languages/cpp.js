const BaseLanguage = require('./BaseLanguage');

class Cpp extends BaseLanguage {
  get image() {return 'codeforge-cpp';}
  get fileName() {return 'main.cpp';}
  getRunCommand(){return 'g++ main.cpp -o main && ./main';}
}

module.exports = Cpp;