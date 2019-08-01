/* eslint-disable max-len */
'use strict';
const amqp = require('amqplib');
const EventEmitter = require('events').EventEmitter;
class AMQPClient {
  constructor() {
    this.emitter = new EventEmitter;
    this.emitter.setMaxListeners(0);
  }
  
  _createConfirmChannel(reconnectCallback) {
    const self = this;
    if (reconnectCallback) {
      self.emitter.once('reconnect', reconnectCallback);
    }
    return self.conn.createConfirmChannel().then(ch => {
      const closeError = () => self.runtimeError('confirm channel is close');
      ch.on('error', err => self.runtimeError(err));
      ch.once('close', closeError);
      // 自定义的关闭
      ch._close = async () => {
        ch.removeListener('close', closeError);
        self.emitter.removeListener('reconnect', reconnectCallback);
        await ch.close();
      };
      return ch;
    }).catch(err => {
      logger.error(`create confirm channel error : ${err}`);
    });
  }

  async connect({ url, delay = 3000 }) {
    this.url = url;
    this.delay = delay;
    const result = await this.reconnect();
    if (result) return this;
    throw new Error('AMQP connect error');
  }

  reconnect() {
    const self = this;
    return amqp.connect(self.url).then(conn => {
      self.conn = conn;
      self.conn.once('close', () => {
        logger.error(`AMQP connect close (${self.url})`);
        Promise.delay(self.delay).then(() => self.reconnect());
      });
      self.conn.on('error', err => self.runtimeError(err));
      self.emitter.emit('reconnect');
      logger.info(`AMQP connect successfully!`);
      return true;
    }).catch(err => {
      logger.error(`AMQP connect error : ${err} (${self.url})`);
      if (self.reconnect) {
        Promise.delay(self.delay).then(() => self.reconnect());
      }
      return false;
    });
  }

  runtimeError(err) {
    logger.error(`AMQP has runtime error : ${err} (${this.url})`);
  }
}

module.exports = AMQPClient;