class BaseLanguage {
  constructor(){
    if(new.target === BaseLanguage){
      throw new Error("BaseLanguage is an abstract class, cannot be used directly");
    }
  }
  get image(){
    throw new Error('image not defined');
  }

  get fileName(){
    throw new Error('fileName not defined');
  }

  getRunCommand(){
    throw new Error('getRunCommand not defined');
  }
}

module.exports = BaseLanguage;