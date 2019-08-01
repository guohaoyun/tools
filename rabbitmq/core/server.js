const _ = require('lodash');
const AMQPClient = require('./amqp_client');
let amqp4web, amqp4local;
const Consumer = require('../mongodb/consumer');
const Producer = require('../mongodb/producer');


async function init(type) {
  logger.info(`进程类型 ${type}`);
  if (!['producer', 'consumer', 'web'].includes(type)) throw Error('进程类型不明确');

  const { connect4local, connect4web } = config;
  amqp4web = await new AMQPClient().connect(connect4web);
  amqp4local = _.isEqual(connect4local, connect4web) ? connect4web : await new AMQPClient().connect(connect4local);
  if (type === 'producer') {
    const alls = await getProducer(publish_ids);
    for (const dbitem of alls) {
      const Produceritem = new mqsProducer(app, dbitem);
      const success = await Produceritem.create();
      if (success) {
        allProducer[Produceritem.id] = Produceritem;
      }
    }
  }
  if (mqsServerType === 'consumer') {
    const alls = await getConsumer(subscribe_ids);
    for (const dbitem of alls) {
      const Consumeritem = new mqsConsumer(app, dbitem);
      const success = await Consumeritem.create();
      if (success) {
        allConsumer[Consumeritem.id] = Consumeritem;
      }
    }
  }
  initMqsEvent();
  initKeepAlive();
}

/** 初始化rabbit实现的跨服(跨进程)通讯 */
async function initMqsEvent() {
  try {
    // queueId 加上 process.pid，保证每一个进程都能收到事件消息
    queueId = `event.queue.${app.config.serverid}.${mqsServerType}.${process.pid}`;
    let eventReceiptQueueId = `eventreceipt.queue.${app.config.serverid}`;
    // 用于进程之间通讯 (收发事件消息)
    channelGlobal = await app.mqconnCenter._createConfirmChannel(initMqsEvent);
    if (!channelGlobal) return;
    // 声明交换器 
    await channelGlobal.assertExchange(exchangeId, 'direct', { durable: false });
    // 非web进程接收消息事件
    if (mqsServerType !== 'web') {
      // 声明队列 
      await channelGlobal.assertQueue(queueId, { durable: false });
      // 将交换器和队列绑定  
      await channelGlobal.bindQueue(queueId, exchangeId, 'event');
      await channelGlobal.consume(queueId, MqsEvent, { noAck: true });
    }
    // web进程收集消息事件回执
    if (mqsServerType === 'web') { 
      await channelGlobal.assertQueue(eventReceiptQueueId, { durable: false });
      await channelGlobal.bindQueue(eventReceiptQueueId, exchangeId, 'eventReceipt');
      await channelGlobal.consume(eventReceiptQueueId, mqsEventReceipt, { noAck: true });
    }
    app.logger.info('mqsServer.initMqsEvent startup success');
  }
  catch (ex) {
    app.logger.error('mqsServer.initMqsEvent error ：' + ex.message);
  }
}

/**心跳协议(未来要设规则，如果持续连不上主服，把本机服务全部stop) */
async function initKeepAlive() {
  try {
    const channel = await app.mqconnCenter._createConfirmChannel(initKeepAlive);
    if (!channel) return;
    // 心跳协议相关
    await channel.assertQueue(keepaliveQueueId, { durable: false });
    await channel.bindQueue(keepaliveQueueId, exchangeId, 'keepalive');
    const rule = '*/10 * * * * *';
    const heartbeatRule = '* */1 * * *';
    // web服 收集心跳数据
    if (mqsServerType === 'web') {
      channel.consume(keepaliveQueueId, msg => {
        const msgContent = JSON.parse(msg.content.toString());
        const createTime = +msgContent.createTime;
        // 只接受1分钟以内的心跳
        if ((Date.now() - createTime) > 60000) {
          return;
        }
        app.getLogger('debugLog').debug('收到心跳 ' + msg.content.toString());
        if (!_.isEmpty(msgContent.data.producer)) {
          keepaliveMsg.producer = {};
          for (let [pid, value] of Object.entries(msgContent.data.producer)) {
            keepaliveMsg.producer[pid] = value;
          }
        }
        if (!_.isEmpty(msgContent.data.consumer)) {
          keepaliveMsg.consumer = {};
          for (let [cid, value] of Object.entries(msgContent.data.consumer)) {
            keepaliveMsg.consumer[cid] = value;
          }
        }
        keepaliveMsg.serverid[msgContent.data.serverid] = createTime;
      }, { noAck: true });

      const checkHeartbeatSchedule = schedule.scheduleJob(heartbeatRule, async () => {
        try {
          const lock = await app.redis.get('system_lock');
          checkHeartbeatSchedule.cancel();
          for (const [id, lastTime] of Object.entries(keepaliveMsg.serverid)) {
            const t = (Date.now() - lastTime) / 1000;
            
            if (t > 60 && lock === 'false') {
              const msg = `进程<${id}>失去心跳，上次心跳时间<${new Date(lastTime).format('yyyy-MM-dd hh:mm:ss')}>`;
              logger.info(msg);
              imAlert(msg);
            }
          }
          for (const [id, obj] of Object.entries(keepaliveMsg.producer)) {
            const { publishName, status, lastTime, lastVersion, intervalTime, serverid, projectId, projectName } = obj;
            if (lastTime && status === 4 && lock === 'false') {
              const t = Date.now() - lastTime;
              if (t > (intervalTime + 10 * 60 * 1000)) {
                const msg = `项目：<${projectName}(id:${projectId})>
生产者：<${publishName}(id:${id})>
上次心跳时间：<${new Date(lastTime).format('yyyy-MM-dd hh:mm:ss')}>，
当前版本号：<${lastVersion}>，
所在进程：<${serverid}>`;
                logger.info(msg);
                imAlert(msg);
              }
            }
          }
        } catch (error) {
          app.logger.error(`mqsServer.check heartbeat shedule error：${error}`);
        }
        checkHeartbeatSchedule.reschedule(heartbeatRule);
      });

    }
    // 非web服发送心跳
    if (mqsServerType !== 'web' && !keepaliveSchedule) {
      // 10秒发一次心跳，暂时发一些简单的字段（未来再增加字段）
      
      keepaliveSchedule = schedule.scheduleJob(rule, async () => {
        keepaliveSchedule.cancel();
        try {
          const serverid = `${app.config.serverid}.${mqsServerType}.${process.pid}`;
          const data = { producer: {}, consumer: {}, serverid };
          for (const [pid, value] of Object.entries(allProducer)) {
            const { publishName, status, lastTime, lastVersion, pullUrl, intervalTime, project, isTaskRunning, isConsumeRunning } = value;
            data.producer[pid] = { id: pid, publishName, status, lastTime, lastVersion, pullUrl, intervalTime, serverid, 
              projectId: project.id, projectName: project.name, isTaskRunning, isConsumeRunning };
              
          }
          for (const [pid, value] of Object.entries(allConsumer)) {
            const { status, lastTime, lastVersion, pushUrl, isConsumeRunning } = value;
            data.consumer[pid] = { id: pid, status, lastTime, lastVersion, pushUrl, serverid, isConsumeRunning };
          }
          const buffer = MqsEventMessage.toBuffer(data, MqsEventMessage.KEEPALIVE);
          await channelGlobal.publish(exchangeId, 'keepalive', buffer);
        } catch (ex) {
          app.logger.error('mqsServer.initKeepAlive publish error：' + ex.message);
        }
        keepaliveSchedule.reschedule(rule);
      });
    }

    app.logger.info('mqsServer.initKeepAlive startup success');
  } catch (ex) {
    app.logger.error('mqsServer.initKeepAlive error：' + ex.message);
  }
}

/** 进程通讯的消息处理 */
async function MqsEvent(msg) {
  app.getLogger('debugLog').debug('收到事件消息 ' + msg.content.toString());
  try {
    const msgitem = JSON.parse(msg.content.toString());
    if ((Date.now() - msgitem.createTime) > 60000) { // 只处理1分钟以内的消息
      app.logger.info(`mqsServer.MqsEvent 丢弃事件消息 ${msg.content.toString()}`);
      return;
    }
    const data = msgitem.data;
    const id = data.id;
    if (msgitem.action === MqsEventMessage.RESET_CONSUMER && mqsServerType === 'consumer') {
      // else 在授权时触发
      if (allConsumer[id]) {
        await allConsumer[id].reset(data);
        if (data.status === 4) {
          allConsumer[id].startConsume();
        }
      } else {
        const Consumeritem = new mqsConsumer(app, data);
        if (checkConsumerMode(Consumeritem)) {
          allConsumer[id] = Consumeritem;
          await Consumeritem.create();
        }
      }
      
    } else if (msgitem.action === MqsEventMessage.RESET_PRODUCER && mqsServerType === 'producer' && allProducer[id]) {
      await allProducer[id].reset(data);
    } else if (msgitem.action === MqsEventMessage.DROP_CONSUMER && allConsumer[id]) {
      await allConsumer[id].drop();
      delete allConsumer[id];
    } else if (msgitem.action === MqsEventMessage.DROP_PRODUCER && allProducer[id]) {
      await allProducer[id].drop();
      delete allProducer[id];
    } else if (msgitem.action === MqsEventMessage.ADD_PRODUCER && mqsServerType === 'producer' && !allProducer[id] && checkProducerMode(data)) {
      const Produceritem = new mqsProducer(app, data);
      allProducer[id] = Produceritem;
      await Produceritem.create();
    } else if (msgitem.action === MqsEventMessage.ADD_CONSUMER && mqsServerType === 'consumer' && !allConsumer[id]) {
      const Consumeritem = new mqsConsumer(app, data);
      if (checkConsumerMode(Consumeritem)) {
        allConsumer[id] = Consumeritem;
        await Consumeritem.create();
      }
    } else if (msgitem.action === MqsEventMessage.RESET_PROJECT) {
      for (const pitem of _.values(allProducer)) {
        if (pitem.project.id === id) {
          pitem.resetProject(data);
        }
      }
      for (const citem of _.values(allConsumer)) {
        if (citem.project.id === id) {
          citem.resetProject(data);
        }
      }
    } else {
      return; // 这里表示消息无法处理
    }
    const receipt = { msgid: msgitem.msgid, serverid: `${app.config.serverid}.${mqsServerType}.${process.pid}`, status: true, action: msgitem.action };
    const receiptMsg = new MqsEventMessage(receipt, MqsEventMessage.MSGRECEIPT);
    await channelGlobal.publish(exchangeId, 'eventReceipt', receiptMsg.toBuffer());
  } catch (err) {
    app.logger.error('mqsServer.consumeMqsEvent error：' + err.message);
    imAlert(`mqsServer.consumeMqsEvent error,${queueId},${err.message}`);
  }
}

/** 收集消息事件回执 */
async function mqsEventReceipt(msg) {
  app.getLogger('debugLog').debug('收到消息事件回执 ' + msg.content.toString());
  try {
    const msgitem = JSON.parse(msg.content.toString());
    allEventReceipt.unshift(msgitem);
    // 只存最近200条
    if (allEventReceipt.length > 200) {
      allEventReceipt.pop();
    }
  } catch (err) {
    app.logger.error('mqsServer.MqsEventReceipt error：' + err.message);
  }
}

/** 验证消息是否收到了消息回执 */
function checkReceipt(msg, checkAllServer = false) {
  const allServerId = [];
  // 通过心跳数据获取目前集群的服务器数组
  for (const [serverid, lastTime] of Object.entries(keepaliveMsg.serverid)) {
    // 放弃超过100分钟没收到心跳的服务器
    if ((Date.now() - lastTime) > 100 * 60 * 1000) {
      continue;
    }
    allServerId.push(serverid);
  }
  for (const receipt of allEventReceipt) {
    if (receipt.data.msgid === msg.msgid) {
      const index = allServerId.indexOf(receipt.data.serverid);
      if (index >= 0) {
        if (checkAllServer) {
          allServerId.splice(index, 1);
        } else {
          return true;
        }
      }
    }
  }
  if (allServerId.length === 0) {
    return true;
  }
  return false;
}

/**
 * 判断生产者是否允许在当前服务器启动
 */
function checkProducerMode(item) {
  return mqsMode === 'hash' && app.allocateIpById(item.id) === app.getLocalIp();
}

/**
 * 判断消费者是否允许在当前服务器启动
 * 以[消费者与生产者必须在同一服务器]这个条件进行判断
*/
function checkConsumerMode(item) {
  logger.info(app.allocateIpById(item.publishId), app.getLocalIp());
  return mqsMode === 'hash' && app.allocateIpById(item.publishId) === app.getLocalIp();
}

/** 关闭服务(一般在重启进程时调用) */
async function stop() {

}

async function sendMqsEvent(item, action) {
  const msg = new MqsEventMessage(item, action);
  await channelGlobal.publish(exchangeId, 'event', msg.toBuffer());
  if (item.project) {
    item.project.key = '保密';
    item.project.IV = '保密';
  }
  const formatMsg = new MqsEventMessage(item, action);
  logger.info(formatMsg);
  return msg;
}
async function getConsumer(ids) {
  return Subscribe.aggregate([{ '$match': { status: { '$ne': -1 } } }, { '$lookup': { from: 'tbl_project', localField: 'projectId', foreignField: 'id', as: 'project' } }]);
}
async function getProducer(ids) {
  let producers = [];
  if (mqsMode === 'all') {
    producers = await app.model.Publish.aggregate([{ '$match': { status: { '$ne': -1 } } }, { '$lookup': { from: 'tbl_project', localField: 'projectId', foreignField: 'id', as: 'project' } }]);
    const publishIds = producers.map(p => p.id);
    const msgTypes = await app.model.Msgtype.find({ publishId: { '$in': publishIds } });
    producers.forEach((pitem, pindex) => {
      producers[pindex].msgtype = [];
      msgTypes.forEach(msgItem => {
        if (msgItem.publishId === pitem.id) producers[pindex].msgtype.push(msgItem);
      });
    });
  } else if (mqsMode === 'hash') {
    producers = await app.model.Publish.aggregate([{ '$match': { id: { '$in': ids }, status: { '$ne': -1 } } },
      { '$lookup': { from: 'tbl_project', localField: 'projectId', foreignField: 'id', as: 'project' } }]);
    const publishIds = producers.map(p => p.id);
    const msgTypes = await app.model.Msgtype.find({ publishId: { '$in': publishIds } });
    producers.forEach((pitem, pindex) => {
      producers[pindex].msgtype = [];
      msgTypes.forEach(msgItem => {
        if (msgItem.publishId === pitem.id) producers[pindex].msgtype.push(msgItem);
      });
    });
  }
  return producers;
}

/** 获取心跳数据 */
function getKeepAliveMsg(type, id) {
  try {
    const { producer, consumer, serverid } = keepaliveMsg;
    const pkTime = 1000 * 60 * 60 * 8;
    for (const key of _.keys(producer)) {
      producer[key].lastTime = producer[key].lastTime ? new Date(+producer[key].lastTime + pkTime) : '';
    }
    for (const key of _.keys(consumer)) {
      consumer[key].lastTime = consumer[key].lastTime ? new Date(+consumer[key].lastTime + pkTime) : '';
    }
    let ret = { producer, consumer, serverid };
    if (type) {
      if (type === 'checkRunning') {
        for (const v of _.values(producer)) {
          if (v.isTaskRunning || v.isConsumeRunning) {
            return 'running';
          }
        }
        for (const v of _.values(consumer)) {
          if (v.isConsumeRunning) {
            return 'running';
          }
        }
        return 'done';
      } else {
        ret = id ? ret[type][id] : ret[type];
      }
    }
    return ret;
  } catch (error) {
    return null;
  }
}

module.exports = { stop, init, sendMqsEvent, MqsEventMessage, getKeepAliveMsg, checkReceipt };
