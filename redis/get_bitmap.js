const Redis = require('ioredis');
const redis = new Redis({
  port: 6379, // Redis port
  host: "127.0.0.1", // Redis host
  password: "",
  db: 0,
});

/**
 * 01110000 （你设7时存储的字节）正好是个合法的 utf-8 流，即字母 p。
 * 10000000（你设8时存储的字节）则不是合法的 utf-8 流，
 * 所以返回 U+FFFD（�）即用来表示编码错误的替代字符，该字符所对应的 utf-8 字节即为：EF BF BD（239, 191, 189）。
 redis3.2可用
 BITFIELD u:sign:1000:201902 get u28 0

 */
async function test() {
  await redis.sendCommand('set', 'tes', 1);
  await redis.setbit('testbit', 8, 1);
  const result = await redis.get('testbit');
  let str = '';
  const buffers = new Buffer(result);
  for (const buffer of buffers) {
    let str4binary = buffer.readUInt16BE().toString(2);
    console.log(str4binary);
    
    if (str4binary.length < 8) {
      str4binary += '00000000'.substr(0, 8 - str4binary.length);
    }
    str += str4binary;
  }
  console.log(str);
  
}

test();