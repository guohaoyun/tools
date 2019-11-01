/* eslint-disable max-len */
'use strict';
//生产者模块
const { createConfirmChannel } = require('./lib');
const queueId = 'test_consumer';
const exchangeId = 'test_exchange';
async function create() {
  try {
    const channel = await createConfirmChannel(); // 本地rabbit
    // 这里用checkExchange比用assertExchange更恰当，但check的工作可以丢到外层，这里尽量简单
    await channel.assertExchange(exchangeId, 'direct', { durable: true });
    await channel.assertQueue(queueId, { durable: true });
    // 同时只处理一条
    await channel.prefetch(1, true);
    // 将交换器和队列绑定 
    await channel.bindQueue(queueId, exchangeId, 'test');
    return channel;
  } catch (err) {
    console.log('创建消费者异常', err);
  }
}

async function run() {
  const channel = await create();
  channel.consume(queueId, msg => consume(msg), { noAck: false, consumerTag: 'unique' });
}

async function consume(msg) {
  console.log(msg.content.toString());
}

run();
  

/**
 * 暂停 (不关闭队列和通道)
 */
function stop() {
  let self = this;
  self.statisError = 0;
  return this.channel.cancel(this.identityId).then(() => self.addLog('已停止'));
}


/**
 * 移除
 */
async function drop() {
  try {
    await this.stop();
    await this.channel.unbindQueue(this.queueId, this.exchangeId, this.cmdtype);
    await this.channel.deleteQueue(this.queueId);
    await this.channel._close();
    await this.channel.nack('', false, true);
  } catch (err) {
    this.sysError('移除消费者队列发生异常', err);
  }
}



