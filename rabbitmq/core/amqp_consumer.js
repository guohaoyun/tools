/* eslint-disable max-len */
'use strict';
//生产者模块
const schedule = require('node-schedule');

const EventMessage = require('./event_message');
const { encrypt, decrypt } = require('../tools/crypt');

require('../tools/dateFormat');

class Consumer {
  constructor(app, subscribe) {
    this.app = app;
    this.init(subscribe);
  }
  statusOk() {
    return this.status === 4;
  }
  async init(subscribe) {
    this.project = subscribe.project.length > 0 ? subscribe.project[0] : subscribe.project;
    this.id = subscribe.id;
    this.publishId = subscribe.publishId;
    this.status = subscribe.status;
    this.projectId = subscribe.projectId;
    this.subscribeType = subscribe.subscribeType;
    this.timeout = subscribe.timeout;
    this.batch = subscribe.batch;
    this.method = subscribe.method;
    this.pushUrl = subscribe.pushUrl;
    this.cmdtype = subscribe.cmdtype;
    this.batch = subscribe.batch;
    this.statisError = 0;//错误统计 
    this.createTime = subscribe.createTime;
    if (!this.lastTime) {
      this.lastTime = '';
    }
    // 这个值只允许初始化一次
    if (!this.lastVersion) {
      this.lastVersion = subscribe.lastVersion;
    }
    this._lastVersion = subscribe._lastVersion;
    this.queueId = 'Consumer.queue.' + this.id;
    this.exchangeId = 'Producer.exchange.' + this.publishId; // 一个发布只有一个交换器，通过cmdtype路由
    this.identityId = 'Consumer.' + this.id;
  }
  async create() {
    let self = this;
    try {
      this.channel = await this.app.mqconnLocal._createConfirmChannel(() => self.create()); // 本地rabbit
      // 这里用checkExchange比用assertExchange更恰当，但check的工作可以丢到外层，这里尽量简单
      await this.channel.assertExchange(this.exchangeId, 'direct', { durable: true });
      await this.channel.assertQueue(this.queueId, { durable: true });
      // 同时只处理一条
      await this.channel.prefetch(1);
      // 将交换器和队列绑定 
      await this.channel.bindQueue(this.queueId, this.exchangeId, this.cmdtype);
      await this.start();
      return true;
    } catch (err) {
      this.sysError('创建消费者异常', err);
      return false;
    }
  }

  /**
   * 立即进行一次消费
   */
  async startConsume() {
    const self = this;
    const msgtype = await this.app.model.Msgtype.findOne({ publishId: this.publishId, cmdtype: this.cmdtype });
    const version = msgtype.lastVersion;
    const msg = EventMessage.toBuffer({ version, dataFormatType: 'c2c' });
    this.channel.sendToQueue(this.queueId, msg, err => self.sysError('发送消息到消费队列异常', err));
  }

  /** 启动 */
  async start() {
    let self = this;
    if (!self.statusOk()) return;
    await this.channel.consume(this.queueId, msg => self.consume(msg), { noAck: false, consumerTag: this.identityId });
    this.addLog('已启动');
  }
  
  async consume(msg) {

    const self = this;

    // 自定义版本号的时候使用_lastVersion覆盖lastVersion。这样做的好处是不会污染当前执行的lastVersion，等下次消费时再改变lastVersion。
    if (this._lastVersion || this._lastVersion === 0) {
      this.lastVersion = this._lastVersion;
      this._lastVersion = null;
    }
    this.lastTime = Date.now();
    
    // 有错误计数，开始降频
    if (this.statisError !== 0 && !this.delay) {
      const ms = this.getDelayTime();
      this.delay = true;
      this.schedule = null;
      this.rescheduleJob(ms, () => {
        self.consume(msg);
      });
      return;
    } else {
      this.delay = false;
    }
    try {
      
      if (!this.statusOk()) {
        await this.ack(msg, true);
        return;
      }
      const msgdata = JSON.parse(msg.content.toString()).data;
      if (msgdata.version <= this.lastVersion) {
        await this.ack(msg, true);
        return;
      }
      const items = await this.app.model.Producer.find({ publishId: this.publishId, cmdtype: this.cmdtype,  version:{ '$gt': this.lastVersion } })
        .limit(this.batch).sort({ version: 1 })
        .catch(error => self.sysError('查询生产者数据异常', error)) || [];
      
      if (items.length === 0) {
        await this.ack(msg, true);
        return;
      }

      let maxVersion = 0;
      for (const item of items) {
        if (item.version > maxVersion) {
          maxVersion = item.version;
        }
      }
      const data = this.batch === 1 ? items[0].data : items.map(item => item.data);
      const postdata = { from: '', publishId: this.publishId, data };
      const rssdata = encrypt(JSON.stringify(postdata), this.project);
      const options = { gzip: true, dataType: 'text', timeout: this.timeout, method: this.method, data: { rssdata } };
      let isError = false;
      let errormsg;
      const startTime = Date.now();
      const result = await this.httpclient.request(this.pushUrl, options).catch(ex => {
        errormsg = { requestData: postdata, responseData: '无', code: ex.code || ex.name, result: '访问异常', startTime };
        isError = true;
      });
      if (result && result.status !== 200) {
        errormsg = { requestData: postdata, responseData: result.data, code: result.status, result: '状态码错误', startTime };
        isError = true;
      }
      let content, jsonContent;
      if (!isError) {
        try {
          content = decrypt(result.data, this.project);
          jsonContent = JSON.parse(content);
          if (jsonContent.code !== 1) {
            errormsg = { requestData: postdata, responseData: content, code: result.status, result: '返回code不为1', startTime };
            isError = true;
          }
        } catch (err) {
          errormsg = { requestData: postdata, responseData: result.data, code: result.status, result: '数据解密错误', startTime };
          isError = true;
        }
      }

      if (isError) {
        this.taskError(errormsg);
      } else {
        // 重置统计值
        this.statisError = 0;
        this.lastVersion = maxVersion; // 更新缓存中的版本号
        logger.info(`${this.identityId} 更新版本号：${maxVersion}`);
        const conditions = { id: this.id, publishId: this.publishId, cmdtype: this.cmdtype };
        const bulkWrite = [];
        for (const item of items) {
          const { publishId, cmdtype, version } = item;
          bulkWrite.push({
            updateOne: {
              filter: { subscribeId: this.id, publishId, cmdtype, version },
              update: { '$setOnInsert': { subscribeId: this.id, publishId, cmdtype, version, status: 2, createTime: new Date() } },
              upsert: true
            }
          });
        }
        try {
          await this.app.model.Subscribe.updateOne(conditions, { lastVersion: maxVersion });
          await this.app.model.Consumer.bulkWrite(bulkWrite);
        } catch (error) {
          logger.error('更新订阅版本号和增加消费记录时发生严重错误', error);
        }
      }
      await this.ack(msg, false);
    } catch (error) {
      this.sysError(`发生致命错误`, error);
    }
  }

  sysError(message, error) {
    this.app.logger.error(`项目：<${this.project.name}(id:${this.project.id})>
订阅id：<${this.id}>
错误原因：${message}`);
    this.app.logger.error(error);
  }

  /**
   * @name task的异常处理
   * @param {Object} message
   */
  taskError(message) {
    logger.info(`${this.identityId} 发生异常：${JSON.stringify(message)}`);
  }

  /**
   * 暂停 (不关闭队列和通道)
   */
  stop() {
    let self = this;
    self.statisError = 0;
    return this.channel.cancel(this.identityId).then(() => self.addLog('已停止'));
  }
  

  /**
   * 移除
   */
  async drop() {
    try {
      await this.stop();
      await this.channel.unbindQueue(this.queueId, this.exchangeId, this.cmdtype);
      await this.channel.deleteQueue(this.queueId);
      await this.channel._close();
    } catch (err) {
      this.sysError('移除消费者队列发生异常', err);
    }
  }

  /**
   * @description 为避免执行两次stop/start，需要判断上一次的状态。
   */
  async reset(item) {
    let oldStatus = this.statusOk();
    this.init(item);
    if (oldStatus && !this.statusOk()) this.stop();
    if (!oldStatus && this.statusOk()) this.start();
      
  }

  resetProject(item) {
    this.project = item;
  }

  addLog(msg) {
    this.app.logger.info(`<${this.identityId}>${msg}`);
  }

  /**
   * @param {String} msg 
   * @param {Boolean} ack 
   */
  async ack(msg, ack = true) {
    try {
      await ack ? this.channel.ack(msg) : this.channel.nack(msg, false, true);
    } catch (error) {
      this.sysError(`${ack ? 'ack' : 'nack'}失败`, error);
    }
  }

  /**
   * 重设定时器
   */
  rescheduleJob(delayTime, cb) {
    try {
      this.schedule = schedule.scheduleJob(delayTime, cb);
    } catch (error) {
      logger.error(`定时器重设失败`);
    }
  }

  getDelayTime() {
    let ms = this.statisError > 9 ? 9 : this.statisError;
    ms = Math.pow(2, ms) * 1000;
    return ms;
  }

}
module.exports = Consumer;