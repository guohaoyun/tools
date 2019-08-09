const _ = require('lodash');
const schedule = require('node-schedule');

const AMQPClient = require('./amqp_client');
require('../tools/dateFormat');

let amqp4web, amqp4local;
const amqpProducer = require('./amqp_producer');
const amqpConsumer = require('./amqp_consumer');


const Consumer = require('../mongodb/consumer');
const Producer = require('../mongodb/producer');
const Subscribe = require('../mongodb/subscribe');
const Publish = require('../mongodb/publish');
const Msgtype = require('../mongodb/msgtype');
const EventMessage = require('./event_message');


const allProducer = {}; // 生产者任务对象集合
const allConsumer = {}; // 消费者任务对象集合
const app = {};

const keepaliveQueueId = 'keepalive.queue';
const exchangeId = 'event.exchange';
let eventQueueId, eventReceiptQueueId; // 消息事件队列id、消息事件回执队列id
let channelGlobal = null; // 用于处理rabbitmq消息的通道
let keepaliveSchedule = null;
const keepaliveMsg = { producer: {}, consumer: {}, serverid: {} }; // 心跳数据
const eventReceiptList = []; // 消息回执集合

let processType;

async function init(type) {
  processType = type;
  logger.info(`进程类型 ${type}`);
  if (!['producer', 'consumer', 'web'].includes(type)) throw Error('进程类型不明确');

  const { connect4local, connect4web } = config;
  amqp4web = app.amqp4web = await new AMQPClient().connect(connect4web);
  amqp4local = app.amqp4local = await new AMQPClient().connect(connect4local);
  
  if (processType === 'producer') {
    const producerList = await getProducer();
    for (const producer of producerList) {
      const ProducerItem = new amqpProducer(app, producer);
      const success = await ProducerItem.create();
      if (success) {
        allProducer[ProducerItem.id] = ProducerItem;
      }
    }
  }
  if (processType === 'consumer') {
    const consumerList = await getConsumer();
    for (const consumer of consumerList) {
      const ConsumerItem = new amqpConsumer(app, consumer);
      const success = await ConsumerItem.create();
      if (success) {
        allConsumer[ConsumerItem.id] = ConsumerItem;
      }
    }
  }
  initEvent();
  initKeepAlive();
}

// 初始化跨服(跨进程)通讯
async function initEvent() {
  try {
    // queueId 加上 process.pid，保证每一个进程都能收到事件消息
    eventQueueId = `event.queue.${config.serverid}.${processType}.${process.pid}`;
    eventReceiptQueueId = `eventreceipt.queue.${config.serverid}`;
    // 用于进程之间通讯 (收发事件消息)
    channelGlobal = await amqp4web._createConfirmChannel(initEvent);
    if (!channelGlobal) return;
    // 声明交换器 
    await channelGlobal.assertExchange(exchangeId, 'direct', { durable: false });
    // 非web进程接收消息事件
    if (processType !== 'web') {
      // 声明队列 
      await channelGlobal.assertQueue(eventQueueId, { durable: false });
      // 将交换器和队列绑定  
      await channelGlobal.bindQueue(eventQueueId, exchangeId, 'event');
      await channelGlobal.consume(eventQueueId, Event, { noAck: true });
    }
    // web进程收集消息事件回执
    if (processType === 'web') { 
      await channelGlobal.assertQueue(eventReceiptQueueId, { durable: false });
      await channelGlobal.bindQueue(eventReceiptQueueId, exchangeId, 'eventReceipt');
      await channelGlobal.consume(eventReceiptQueueId, EventReceipt, { noAck: true });
    }
    logger.info('mqsServer.initMqsEvent startup success');
  }
  catch (error) {
    logger.error(`mqsServer.initMqsEvent error ： ${error}`);
  }
}

/**心跳协议(未来要设规则，如果持续连不上主服，把本机服务全部stop) */
async function initKeepAlive() {
  try {
    const channel = await amqp4web._createConfirmChannel(initKeepAlive);
    if (!channel) return;
    // 心跳协议相关
    await channel.assertQueue(keepaliveQueueId, { durable: false });
    await channel.bindQueue(keepaliveQueueId, exchangeId, 'keepalive');
    const keepaliveRule = '*/10 * * * * *';
    const heartbeatRule = '* */1 * * *';
    
    // web服 收集心跳数据
    if (processType === 'web') {
      channel.consume(keepaliveQueueId, msg => {
        const eventMessage = JSON.parse(msg.content.toString());
        const createTime = +eventMessage.createTime;
        // 只接受1分钟以内的心跳
        if (Date.now() - createTime > 60000) return;
        logger.info(`收到心跳 ${msg.content.toString()}`);
        if (!_.isEmpty(eventMessage.body.producer)) {
          keepaliveMsg.producer = {};
          for (const [pid, value] of Object.entries(eventMessage.body.producer)) keepaliveMsg.producer[pid] = value;
        }
        if (!_.isEmpty(eventMessage.body.consumer)) {
          keepaliveMsg.consumer = {};
          for (const [cid, value] of Object.entries(eventMessage.body.consumer)) keepaliveMsg.consumer[cid] = value;
        }
        keepaliveMsg.serverid[eventMessage.body.serverid] = createTime;
      }, { noAck: true });

      // 非web服发送心跳
      if (processType !== 'web' && !keepaliveSchedule) {
      // 10秒发一次心跳，暂时发一些简单的字段（未来再增加字段）
        keepaliveSchedule = schedule.scheduleJob(keepaliveRule, async () => {
          keepaliveSchedule.cancel();
          try {
            const serverid = `${config.serverid}.${processType}.${process.pid}`;
            const data = { producer: {}, consumer: {}, serverid };
            for (const [pid, value] of Object.entries(allProducer)) data.producer[pid] = value;
            for (const [pid, value] of Object.entries(allConsumer)) data.consumer[pid] = value;
            const buffer = EventMessage.toBuffer(data, EventMessage.KEEPALIVE);
            await channelGlobal.publish(exchangeId, 'keepalive', buffer);
          } catch (error) {
            logger.error(`mqsServer.initKeepAlive publish error： ${error}`);
          }
          keepaliveSchedule.reschedule(keepaliveRule);
        });
      }

      const checkHeartbeatSchedule = schedule.scheduleJob(heartbeatRule, async () => {
        try {
          checkHeartbeatSchedule.cancel();
          for (const [id, lastTime] of Object.entries(keepaliveMsg.serverid)) {
            const t = (Date.now() - lastTime) / 1000; // 距离上次心跳时间
            // 失去心跳超过60秒
            if (t > 60) logger.error(`进程<${id}>失去心跳，上次心跳时间<${new Date(lastTime).format('yyyy-MM-dd hh:mm:ss')}>`);
          }
          for (const [id, obj] of Object.entries(keepaliveMsg.producer)) {
            const { publishName, status, lastTime, lastVersion, intervalTime, serverid, projectId, projectName } = obj;
            if (lastTime && status === 4) {
              const t = Date.now() - lastTime; // 距离上次心跳时间
              // 失去心跳超过10分钟
              if (t > (intervalTime + 10 * 60 * 1000)) {
                logger.error(`项目：<${projectName}(id:${projectId})>
生产者：<${publishName}(id:${id})>
上次心跳时间：<${new Date(lastTime).format('yyyy-MM-dd hh:mm:ss')}>，
当前版本号：<${lastVersion}>，
所在进程：<${serverid}>`);
              }
            }
          }
        } catch (error) {
          logger.error(`mqsServer.check heartbeat shedule error：${error}`);
        }
        checkHeartbeatSchedule.reschedule(heartbeatRule);
      });

    }
    logger.info('mqsServer.initKeepAlive startup success');
  } catch (ex) {
    logger.error('mqsServer.initKeepAlive error：' + ex.message);
  }
}

/** 进程通讯的消息处理 */
async function Event(msg) {
  logger.info(`收到事件消息 ${msg.content.toString()}`);
  try {
    const eventMessage = JSON.parse(msg.content.toString());
    if ((Date.now() - eventMessage.createTime) > 60000) { // 只处理1分钟以内的消息
      logger.info(`mqsServer.MqsEvent 丢弃事件消息 ${msg.content.toString()}`);
      return;
    }
    const messageBody = eventMessage.body;
    const { id } = messageBody;
    if (eventMessage.action === EventMessage.RESET_CONSUMER && processType === 'consumer' && allConsumer[id]) {
      await allConsumer[id].reset(messageBody);
      if (messageBody.status === 4) {
        allConsumer[id].startConsume();
      }
    } else if (eventMessage.action === EventMessage.RESET_PRODUCER && processType === 'producer' && allProducer[id]) {
      await allProducer[id].reset(messageBody);
    } else if (eventMessage.action === EventMessage.DROP_CONSUMER && allConsumer[id]) {
      await allConsumer[id].drop();
      delete allConsumer[id];
    } else if (eventMessage.action === EventMessage.DROP_PRODUCER && allProducer[id]) {
      await allProducer[id].drop();
      delete allProducer[id];
    } else if (eventMessage.action === EventMessage.ADD_PRODUCER && processType === 'producer' && !allProducer[id]) {
      const Produceritem = new amqpProducer(messageBody);
      allProducer[id] = Produceritem;
      await Produceritem.create();
    } else if (eventMessage.action === EventMessage.ADD_CONSUMER && processType === 'consumer' && !allConsumer[id]) {
      const Consumeritem = new amqpConsumer(messageBody);
      allConsumer[id] = Consumeritem;
      await Consumeritem.create();
    } else if (eventMessage.action === EventMessage.RESET_PROJECT) {
      for (const pitem of _.values(allProducer)) {
        if (pitem.project.id === id) pitem.resetProject(messageBody);
      }
      for (const citem of _.values(allConsumer)) {
        if (citem.project.id === id) citem.resetProject(messageBody);
      }
    } else {
      return; // 这里表示消息无法处理
    }
    const receipt = { msgid: eventMessage.msgid, serverid: `${config.serverid}.${processType}.${process.pid}`, status: true, action: eventMessage.action };
    const receiptMsg = new EventMessage(receipt, EventMessage.MSGRECEIPT);
    await channelGlobal.publish(exchangeId, 'eventReceipt', receiptMsg.toBuffer());
  } catch (error) {
    logger.error(`amqp_server.Event error： ${error}`);
  }
}

/** 收集消息事件回执 */
async function EventReceipt(msg) {
  logger.info(`收到消息事件回执 ${msg.content.toString()}`);
  try {
    const msgitem = JSON.parse(msg.content.toString());
    eventReceiptList.unshift(msgitem);
    // 只存最近200条
    if (eventReceiptList.length > 200) {
      eventReceiptList.pop();
    }
  } catch (error) {
    logger.error('amqp_server.EventReceipt error： ${error}');
  }
}

/** 验证消息是否收到了消息回执 */
function checkReceipt(msg, checkAllServer = false) {
  const allServerId = [];
  // 通过心跳数据获取目前集群的服务器数组
  for (const [serverid, lastTime] of Object.entries(keepaliveMsg.serverid)) {
    // 放弃超过100分钟没收到心跳的服务器
    if ((Date.now() - lastTime) > 100 * 60 * 1000) continue;
    allServerId.push(serverid);
  }
  for (const receipt of eventReceiptList) {
    if (receipt.body.msgid === msg.msgid) {
      const index = allServerId.indexOf(receipt.data.serverid);
      if (index >= 0) {
        if (checkAllServer) allServerId.splice(index, 1);
        else return true;
      }
    }
  }
  return allServerId.length === 0;
}


async function sendEvent(item, action) {
  const msg = new EventMessage(item, action);
  await channelGlobal.publish(exchangeId, 'event', msg.toBuffer());
  return msg;
}
async function getConsumer() {
  return Subscribe.aggregate([
    { '$match': { status: { '$ne': -1 } } },
    { '$lookup': { from: 'tbl_project', localField: 'projectId', foreignField: 'id', as: 'project' } }
  ]).toArray();
}
async function getProducer() {
  try {
    const publishList = await Publish.aggregate([
      { '$match': { status: { '$ne': -1 } } },
      { '$lookup': { from: 'tbl_project', localField: 'projectId', foreignField: 'id', as: 'project' } }
    ]).toArray();
    const msgtypeList = await Msgtype.find({ publishId: { '$in': publishList.map(p => p.id) } }).toArray();
    // 为了减少查询开销，先把所有消息类型拿出来，然后逐个匹配发布
    for (const publish of publishList) {
      publish.msgtypes = [];
      for (const msgtype of msgtypeList) {
        if (msgtype.publishId === publish.id) {
          publish.msgtypes.push(msgtype);
        }
      }
    }
    return publishList;
  } catch (error) {
    logger.error(`获取生产者集合异常`, error);
    return [];
  }
}

/** 获取心跳数据 */
function getKeepAliveMsg() {
  try {
    const { producer, consumer, serverid } = keepaliveMsg;
    const pkTime = 1000 * 60 * 60 * 8;
    for (const key of _.keys(producer)) {
      producer[key].lastTime = producer[key].lastTime ? new Date(+producer[key].lastTime + pkTime) : '';
    }
    for (const key of _.keys(consumer)) {
      consumer[key].lastTime = consumer[key].lastTime ? new Date(+consumer[key].lastTime + pkTime) : '';
    }
    return { producer, consumer, serverid };
  } catch (error) {
    return null;
  }
}

module.exports = { init, checkReceipt, sendEvent, getKeepAliveMsg };
