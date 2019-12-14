'use strict';
const Promise = require('bluebird');
const queueId = 'test_producer';
const exchangeId = 'test_exchange';
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
  // channel.publish(exchangeId, 'test', new Buffer('ghy1'), { deliveryMode: true });
  // channel.publish(exchangeId, 'test', new Buffer('ghy2'), { deliveryMode: true });
  // channel.publish(exchangeId, 'test', new Buffer('ghy3'), { deliveryMode: true });
  while (true) {
    await Promise.delay(100);
    channel.publish(exchangeId, 'test', new Buffer(''+Date.now()), { deliveryMode: true });
  }
}

run();