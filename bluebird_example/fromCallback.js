const Promise = require('bluebird');

function findID(id, cb) {
  cb(null, id);
}

Promise.fromCallback(callback => {
  return findID(1853, callback);
}).then(id => {
  console.log(id);
});
