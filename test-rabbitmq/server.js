/* eslint-disable max-statements-per-line */
/* eslint-disable max-len */
'use strict';
//生产者模块
const queueId = 'test_producer';
const exchangeId = 'test_exchange';
const { createConfirmChannel } = require('./lib');

async function create() {
  try {
    const channel = await createConfirmChannel(); // 本地rabbit
    await channel.assertQueue(queueId, { durable: true });
    await channel.prefetch(1, true);
    // 申请一个direct类型MQ，用于通知消费者有新的数据 
    channel.assertExchange(exchangeId, 'direct', { durable: true });
    return channel;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function run() {
  const channel = await create();
  channel.publish(exchangeId, 'test', new Buffer('ghy'), { deliveryMode: true }, (err, ok) => {
    if (err) {
      console.log('推送新数据到交换器失败', err);
    }
  });
}

run();