const BitSet = require('bitset');

const Redis = require('ioredis');
const redis = new Redis({
  port: 6379, // Redis port
  host: "127.0.0.1", // Redis host
});


async function test() {
  const result = await redis.get('ghy');
  const bufs = Buffer.from(result);
  console.log(bufs);
  
  let count = 0;
  for (const buf of bufs) {
    for (let i = 0; i < 8; i++) {
      if (buf >> i & 1 === 1) {
        count++;
      }
    }
  }
  console.log(count);
  
  
  // await redis.setbit('checkin:20200414', 1000, 1);
  // await redis.setbit('checkin:20200414', 1001, 1);
  // await redis.setbit('checkin:20200414', 1002, 1);
  // await redis.setbit('checkin:20200414', 1003, 1);
  // await redis.setbit('checkin:20200413', 1001, 0);
  // await redis.setbit('checkin:20200413', 1002, 1);
  // await redis.setbit('checkin:20200413', 1003, 1);
  // await redis.setbit('checkin:20200413', 1022, 1);
}

test();
