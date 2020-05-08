const fs = require('fs');
var readline = require('readline');
var os = require('os');
const lodash = require('lodash');

var fReadName = './14点.txt';
var fWriteName = './筛选后14点';
var fRead = fs.createReadStream(fReadName);
// var fWrite = fs.createWriteStream(fWriteName);

var objReadline = readline.createInterface({
  input: fRead
});
let arr = [];
objReadline.on('line', line => {
  const t = line.match(/(\d*)ms/);
  if (t) {
    if (+t[1] > 5000) {
      fs.writeFile(fWriteName, line + '\n', { flag: 'a' }, err => {
        if (err) {}
      })
    }
  }
  
  // const l = line.split('|')[1];
  // arr.push(line);
});

objReadline.on('close', () => {
  console.log('done');
  
  
  // fWrite.write(); // 下一行
});
