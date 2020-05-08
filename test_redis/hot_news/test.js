const Redis = require('ioredis');
const redis = new Redis({
  port: 6379, // Redis port
  host: "127.0.0.1", // Redis host
});


async function add(date) {
  try {
    for (let i = 0; i < 100000000; i++) {
      const id = parseInt(Math.random() * 100000);
      await redis.zincrby(date, 1, id);
      console.log(i);
      
    }
    console.log('done');
  } catch (error) {
    console.log(error);
  }
}

add('news');