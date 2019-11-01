// 创建socket客户端 client.js
const net = require('net');
const iconv  = require('iconv-lite');
const logger = console;
const client = net.connect({ port: 8087 });
let buf = new Buffer(0);
client.on('connect', () => {
  // client.write('data from client');
});
client.on('error', error => {
  logger.info(error);
  // client.write('data from client');
});
client.on('data', (chunk = new Buffer(0)) => {
  let buffer = Buffer.concat([buf, chunk]);

  if (buffer.length > 4) {
    let packLength = buffer.readUInt32LE(0);

    while (packLength <= buffer.length) {          //达到长度
      if (packLength > 16 * 1024 * 1024) {         //大小超限
        buf = new Buffer(0);
        return;
      }

      const packBuff = buffer.slice(0, packLength);  //从缓冲区取出
      buffer         = buffer.slice(packLength);

      if (packBuff[packLength - 1] === 0) {        //尾标记正确
        const encryptMark = packBuff.readInt8(4);
        const msgBuff     = packBuff.slice(5, packLength - 1);

        onPackage(msgBuff, encryptMark);
      }

      packLength = buffer.length >= 4 ? buffer.readUInt32LE(0) : Infinity;//长度不足不再继续
    }
  }
  buf = buffer;
});

function onPackage(buffer, encryptMark) {
  let msg;
  let message = {
    passport: '57da00080e',
    server: 1853,
    servername: '1853',
    encoding: 'utf8',
    gate: 'test',
    publishId: 1
  };

  try {
    let str = iconv.decode(buffer, 'utf8');
    str     = str.replace(/[\u0000-\u001F\u2028\u2029]/g, ''); //去除不合法的unicode字节（文本出现乱码的时候会有这种情况）
    msg     = JSON.parse(str);
  } catch (err) {
    // return logger.error(`${this.address} [${this.id}] message parse has error : ${err.message}, encryptMark: ${encryptMark}, msg(base64): ${buffer.toString('base64')}`);
  }
  if (msg.action === 'getauth') {
    message.action = 'r_getauth';
  } else if (msg.action === 'setstep') {
    message.action = 'r_setstep';
    message.recode = 0;
  }
  sendMessage(message);
}

/**
 * 发送消息
 * @param {String} message 
 */
function sendMessage(message) {
  const messageBuffer = iconv.encode(JSON.stringify(message), 'utf8');
  const encrypt = 0;
  const packLength = messageBuffer.length + 6;
  const packBuff   = new Buffer(packLength);
  packBuff.writeInt32LE(packLength, 0);
  packBuff.writeInt8(encrypt, 4);
  messageBuffer.copy(packBuff, 5, 0, messageBuffer.length);
  packBuff.writeInt8(0, packLength - 1);
  client.write(packBuff);
}

function testSend() {
  let message = {
    action: 'publishData',
    op: 'test',
    uuid: '123456789abc',
    data: [{ version: 1, number:123 }, { version: 2, number: 321 }]
  };

  sendMessage(message);
}

setInterval(() => {
  testSend();
}, 2000);

// setTimeout(() => {
//   client.end();
// }, 60 * 60 * 1000 );