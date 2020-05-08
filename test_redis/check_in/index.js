const BitSet = require('bitset');

const Redis = require('ioredis');
const redis = new Redis({
  port: 6379, // Redis port
  host: "127.0.0.1", // Redis host
});
// bitset 设置 0 1

async function checkin() {
  await redis.flushdb();
  // await redis.setbit('checkin:20200414', 1000, 1);
  // await redis.setbit('checkin:20200414', 1001, 1);
  // await redis.setbit('checkin:20200414', 1002, 1);
  // await redis.setbit('checkin:20200414', 1003, 1);
  // await redis.setbit('checkin:20200413', 1001, 0);
  // await redis.setbit('checkin:20200413', 1002, 1);
  // await redis.setbit('checkin:20200413', 1003, 1);
  // await redis.setbit('checkin:20200413', 1022, 1);
  await redis.setbit('checkin:20200413', 22, 1);
}

async function test() {
  await checkin();
  const result = await redis.bitop('not', 'result', 'checkin:20200413');
  const r = await redis.bitcount('result');
  console.log(r);
  
}

test();
