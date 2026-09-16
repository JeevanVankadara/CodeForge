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

  get compile(){
    return null;
  }

  get run(){
    throw new Error('run not defined');
  }
}

module.exports = BaseLanguage;
