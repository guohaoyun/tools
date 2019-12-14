'use strict';
const Promise = require('bluebird');
const { createConfirmChannel } = require('./lib');
const queueId = 'test_consumer';
const exchangeId = 'test_exchange';
const consumerTag = 'unique';
let global_channel;
async function create() {
  try {
    const channel = await createConfirmChannel();
    await channel.assertExchange(exchangeId, 'direct', { durable: true });
    await channel.assertQueue(queueId, { durable: true });
    await channel.prefetch(1);
    await channel.bindQueue(queueId, exchangeId, 'test');
    return channel;
  } catch (err) {
    console.log('创建消费者异常', err);
    return false;
  }
}
async function run() {
  global_channel = await create();
  await global_channel.consume(queueId, msg => consume(msg), { noAck: false, consumerTag });
}

async function consume(msg) {
  // if (!map[msgContent]) {
  //   map[msgContent] = 1;
  //   console.log(map);
  // } else {
  //   map[msgContent] = map[msgContent] + 1;
  // }
  // if (total % 1000 === 0) {
  //   console.log(map);
  // }
  await Promise.delay(200);
  // await global_channel.nack(msg);
  await global_channel.cancel(consumerTag);
  await global_channel.consume(queueId, msg => consume(msg), { noAck: false, consumerTag });
  
}

run();

