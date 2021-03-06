/* eslint-disable max-statements-per-line */
/* eslint-disable max-len */
'use strict';
//生产者模块
const schedule = require('node-schedule');
const rp = require('request-promise');

const EventMessage = require('./event_message');
const MongoClient = require('../mongodb/index').MongoClient;
const Publish = require('../mongodb/publish');
const Producer = require('../mongodb/producer');
const Msgtype = require('../mongodb/msgtype');

const { encrypt, decrypt } = require('../tools/crypt');
require('../tools/dateFormat');

class Producer4AMQP {
  constructor(app, publish) {
    this.app = app;
    this.init(publish);
  }
  statusOk() {
    return this.status === 4;
  }
  async init(publish) {
    this.project = publish.project.length > 0 ? publish.project[0] : publish.project;
    this.id = publish.id;
    this.publishName = publish.publishName;
    this.status = publish.status;
    this.projectId = publish.projectId;
    this.timeout = publish.timeout;
    this.intervalTime = publish.intervalTime;
    this.method = publish.method;
    this.pullUrl = publish.pullUrl;
    this.msgtypes = publish.msgtypes;
    this.createTime = publish.createTime;
    this.updateTime = publish.updateTime;
    this.statisError = 0;//错误统计
    this.lastTime = '';
    //这个值只允许赋值一次
    if (!this.lastVersion) {
      this.lastVersion = publish.lastVersion;
    }
    this._lastVersion = publish._lastVersion;
    this.queueId = 'Producer.queue.' + this.id;
    this.exchangeId = 'Producer.exchange.' + this.id;
    this.identityId = 'Producer.' + this.id;
  }

  async create() {
    const self = this;
    try {
      this.channel = await this.app.amqp4local._createConfirmChannel(() => self.create()); // 本地rabbit
      await this.channel.assertQueue(this.queueId, { durable: true });
      await this.channel.prefetch(1);
      // 申请一个direct类型MQ，用于通知消费者有新的数据 
      this.channel.assertExchange(this.exchangeId, 'direct', { durable: true });
      await this.start();
      return true;
    } catch (err) {
      this.sysError('创建生产者失败', err);
      return false;
    }
  }

  async start() {
    let self = this;
    if (!this.statusOk()) return;
    await this.channel.consume(this.queueId, msg => self.consume(msg), { noAck: false, consumerTag: this.identityId });
    const startTime = Date.now() + this.intervalTime;
    this.schedule = schedule.scheduleJob(startTime, () => self.task());
    this.addLog('已启动');
  }

  async task() {
    if (!this.statusOk()) return;
    // 自定义版本号的时候使用_lastVersion覆盖lastVersion。这样做的好处是不会污染当前执行的lastVersion，等下次定时器运行时再改变lastVersion。
    if (this._lastVersion || this._lastVersion === 0) {
      this.lastVersion = this._lastVersion;
      this._lastVersion = null;
    }
    try {
      this.lastTime = Date.now();
      const requestData = { 'version': this.lastVersion };
      const rssdata = encrypt(JSON.stringify(requestData), this.project);
      const options = { gzip: true, json: true, timeout: this.timeout, method: 'POST', body: { rssdata }, resolveWithFullResponse: true };
      let errormsg, isError;
      const startTime = Date.now();
      const result = await rp(this.pullUrl, options).catch(ex => {
        const { message, statusCode, error } = ex;
        errormsg = { requestData, responseData: message, code: statusCode || error.code, result: '访问异常', startTime };
        isError = true;
      });
      if (result && result.statusCode !== 200) {
        errormsg = { requestData, responseData: result.body, code: result.statusCode, result: '状态码错误', startTime };
        isError = true;
      }
      let response, jsonResponse;
      let maxVersion = 0;
      if (!isError) {
        try {
          response = decrypt(result.body, this.project);
          jsonResponse = JSON.parse(response);
          if (jsonResponse.code !== 1) {
            errormsg = { requestData, responseData: response, code: result.statusCode, result: '返回code不为1', startTime };
            isError = true;
          }
          let tempVersion = 0;
          if (jsonResponse.data) {
            for (const item of jsonResponse.data) {
              // 确保符合协议
              const keys = Object.keys(item);
              if (!keys.includes('version') || !keys.includes('data') || !keys.includes('cmdtype')) {
                isError = true;
                errormsg = { requestData, responseData: response, code: result.statusCode, result: '非约定文本协议', startTime };
                break;
              }
              if (+item.version > tempVersion) {
                tempVersion = +item.version;
              }
            }
          }
          if (tempVersion > maxVersion) {
            maxVersion = tempVersion;
          }
        } catch (err) {
          errormsg = { requestData, responseData: response, code: result.statusCode, result: '数据解密错误', startTime };
          isError = true;
        }
      }
      
      if (isError) {
        this.taskError(errormsg);
      } else {
        // 重置统计值
        this.statisError = 0;
        // 入队mq
        if (maxVersion > this.lastVersion) {
          this.channel.sendToQueue(this.queueId, new Buffer(response), { deliveryMode: true });
          /**
           * 假如rabbit服务异常(关闭) waitForConfirms可能会无限阻塞
           * 猜测 waitForConfirms只对发出的消息做确认，不会影响通道上consume的工作
           */
          let addmq = await this.channel.waitForConfirms().catch(err => this.sysError('waitForConfirms失败', err));
          if (addmq) {
            this.lastVersion = maxVersion;
          }
        }
      }
    } catch (err) {
      this.sysError('task异常', err);
    }
    // 重新注册任务
    this.schedule.reschedule(this.getDelayTime());
  }

  async consume(msg) {
    try {
      const self = this;
      const content = msg.content.toString();
      const jsonContent = JSON.parse(content);
      const allNewData = [];
      const newVersion = {};
      let maxVersion = 0;
      if (jsonContent.data) {
        for (const item of jsonContent.data) {
          let { version, cmdtype, data } = item;
          version = +version;

          // 添加到tbl_producer表的数据
          allNewData.push({
            updateOne: {
              filter: { publishId: this.id, version, cmdtype },
              update: { '$setOnInsert': { publishId: this.id, version, cmdtype, data, createTime: new Date() } },
              upsert: true
            }
          });
  
          // 提取每个消息类型的最新版本号
          if (!newVersion[cmdtype]) {
            newVersion[cmdtype] = 0;
          }
          if (version > newVersion[cmdtype]) {
            newVersion[cmdtype] = version;
          }
          if (version > maxVersion) {
            maxVersion = version;
          }
          
        }
      }

      // 更新消息类型的版本
      const allNewVersion = new Array();
      for (const [cmdtype, lastVersion] of Object.entries(newVersion)) {
        allNewVersion.push({
          updateOne: {
            filter: { publishId: this.id, cmdtype, lastVersion: { '$lte': lastVersion } },
            update: { '$set': { lastVersion } },
            upsert: false
          }
        });
      }

      if (allNewData.length === 0) {
        await this.ack(msg, true);
        return;
      }
      let success = true;
      let session;
      try {
        // mongodb断开后，驱动会自动重连，重连成功前此处会无限等待
        session = await MongoClient.client.startSession();
        await session.startTransaction();
        for (let item of allNewVersion) {
          item['session'] = session;
        }
        for (let item of allNewData) {
          item['session'] = session;
        }
        if (allNewVersion.length > 0) {
          await Msgtype.bulkWrite(allNewVersion);
        }
        await Producer.bulkWrite(allNewData);
        await Publish.updateOne({ id: this.id }, { '$set': { lastVersion: maxVersion } }, { upsert: false, session });
        await session.commitTransaction();
      } catch (err) {
        this.sysError(`mongodb异常`, err);
        await session.abortTransaction();
        success = false;
      } finally {
        await session.endSession();
      }
      if (success) {
        await this.ack(msg, true);
        const allNewCmdType = Object.keys(newVersion);
        // 把有新数据的消息类型推给交换器
        if (this.msgtypes) {
          for (const msgtype of this.msgtypes) {
            const cmdtype = msgtype.cmdtype;
            if (allNewCmdType.includes(cmdtype)) {
              // p2c 代表数据是生产者推送给消费者的
              const msg = EventMessage.toBuffer({ dataFormatType: 'p2c', version: newVersion[cmdtype] });
              this.channel.publish(this.exchangeId, cmdtype, msg, { deliveryMode: true }, err => {
                if (err) self.sysError('推送新数据到交换器失败', err);
              });
            }
          }
        }
      } else {
        await this.ack(msg, false);
      }
    } catch (err) {
      this.sysError(`发生致命错误`, err);
    }
  }
  
  /**
   * @name task的异常处理
   * @param {Object} message
   */
  taskError(message) {
    this.statisError++;
    logger.info(`${this.identityId} 发生异常：${JSON.stringify(message)}`);
  }

  /**
   * 停止
   */
  stop() {
    let self = this;
    if (this.schedule) {
      this.schedule.cancel();
    }
    this.statisError = 0;
    return this.channel.cancel(this.identityId).then(() => self.addLog('已停止'));
  }
  
  /**
   * 销毁
   */
  async drop() {
    try {
      await this.stop();
      await this.channel.deleteQueue(this.queueId);
      await this.channel.deleteExchange(this.exchangeId);
      await this.channel._close(); // 如果有消费者正在执行(比如ack()),应该会报异常
      this.schedule = null;
      this.channel = null;
      this.addLog('已销毁');
    } catch (err) {
      this.sysError('销毁生产者异常', err);
    }
  }

  /**
   * 重置生产者
   */
  reset(item) {
    const oldStatus = this.statusOk();
    this.init(item);
    if (this.schedule && !this.statusOk() && oldStatus) {
      this.stop();
    }
    if (!oldStatus && this.statusOk()) {
      this.start();
    }
  }

  /**
   * 重置项目
   */
  resetProject(item) {
    this.project = item;
  }

  addLog(msg) {
    logger.info(`<${this.identityId}>${msg}`);
  }

  sysError(msg, error) {
    logger.error(`项目：<${this.project.name}(id:${this.project.id})>
生产者：<${this.publishName}(id:${this.id})>
错误原因：${msg}`);
    logger.error(error);
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

  getDelayTime() {
    let delayTime = Date.now() + this.intervalTime;
    // 有错误计数，开始降频
    if (this.statisError !== 0) {
      let ms = this.statisError > 9 ? 9 : this.statisError;
      ms = Math.pow(2, ms) * 1000;
      delayTime += ms;
    }
    return delayTime;
  }
}
module.exports = Producer4AMQP;