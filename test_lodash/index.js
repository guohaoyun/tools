const lodash = require('lodash');

console.log(lodash.chain([]).groupBy('project').value());

// .map((i, j) =>  console.log(i,j))