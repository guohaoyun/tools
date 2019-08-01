const { PassThrough } = require('stream');
const fs = require('fs');

const d = new PassThrough();

fs.createReadStream('./test').pipe(d);  // can be piped from reaable stream

d.pipe(process.stdout);                 // can pipe to writable stream 
d.on('data', console.log);             // also like readable