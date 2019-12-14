'use strict';
const { createConfirmChannel } = require('./lib');
const queueId = 'test_consumer';
const exchangeId = 'test_exchange';
const consumerTag = 'unique';
const pattern = 'test';
const array = [];
let global_channel;
async function create() {
  try {
    const channel = await createConfirmChannel();
    await channel.assertExchange(exchangeId, 'direct', { durable: true });
    await channel.assertQueue(queueId, { durable: true });
    await channel.prefetch(1);
    await channel.bindQueue(queueId, exchangeId, pattern);
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
  // 先不消费，放回队列 
  if (!array.includes(msg.content.toString())) {
    array.push(msg.content.toString());
    console.log(array);
  }
  await global_channel.nack(msg);
}

run();