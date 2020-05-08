const Redis = require('ioredis');
const redis = new Redis({
  port: 6379, // Redis port
  host: "127.0.0.1", // Redis host
});

async function show(date) {
  try {
    const results = await redis.zrevrange(date, 0, 10, "WITHSCORES");
    console.log(results);
  } catch (error) {
    console.log(error);
  }
}

show('2020-04-16:news');