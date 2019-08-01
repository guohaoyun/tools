const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const port = process.argv[2];

const server = http.createServer((req, res) => {
  const filename = req.headers.filename;
  console.log('File request received: ' + filename);
  req
    .pipe(crypto.createDecipher('aes192', 'a_shared_secret'))
    .pipe(zlib.createGunzip())
    .pipe(fs.createWriteStream(filename+'.server'))
    .on('finish', () => {
      res.writeHead(201, {
        'Content-Type': 'text/plain'
      });
      res.end('That\'s it\n');
      console.log(`File saved: ${filename}`);
    })
    .on('error', error => console.log(error));
});

server.listen(port, () => console.log(`Listening ${port}`));