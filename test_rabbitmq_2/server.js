'use strict';
const Promise = require('bluebird');
const queueId = 'test_producer';
const exchangeId = 'test_exchange';
const pattern = 'test';
const { createConfirmChannel } = require('./lib');

async function create() {
  try {
    const channel = await createConfirmChannel();
    await channel.assertQueue(queueId, { durable: true });
    channel.assertExchange(exchangeId, 'direct', { durable: true });
    return channel;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function run() {
  const channel = await create();
  while (true) {
    await Promise.delay(200);
    await channel.publish(exchangeId, pattern, new Buffer(Date.now() + ''), { deliveryMode: true });
  }
}

run();