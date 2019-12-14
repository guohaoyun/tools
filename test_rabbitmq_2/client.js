'use strict';
const { createConfirmChannel } = require('./lib');
const queueId = 'test_consumer';
const exchangeId = 'test_exchange';
const consumerTag = 'unique';
const pattern = 'test';
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
  try {
    // 频繁重启
    await global_channel.cancel(consumerTag);
    await global_channel.consume(queueId, msg => consume(msg), { noAck: false, consumerTag });
  } catch (error) {
    console.log(error);
  }
}

run();