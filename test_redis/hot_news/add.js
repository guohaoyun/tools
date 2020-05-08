const Redis = require('ioredis');
const redis = new Redis({
  port: 6379, // Redis port
  host: "127.0.0.1", // Redis host
});
const Roll = require('../../tools/roll');


async function add(date) {
  try {
    const roll = new Roll();
    roll.add('news_a', 100);
    roll.add('news_b', 30);
    roll.add('news_c', 90);
    roll.add('news_d', 60);
    for (let i = 0; i < 100; i++) {
      await redis.zincrby(date, 1, roll.dice());
    }
    console.log('done');
  } catch (error) {
    console.log(error);
  }
}

add('2020-04-16:news');