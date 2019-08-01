const Promise = require('bluebird');

async function test() {
  await Promise.map([1, 2, 3, 4, 5, 6], async num => {
    console.log(num);
    await Promise.delay(2000);
  }, { concurrency: 2 });
}

test();