const {nanoid} = require('nanoid');

const createId = () => {
  const val = nanoid();
  return val;
}

module.exports = createId;