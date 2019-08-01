'use strict';
const uuid = require('uuid');
// 消息事件
class EventMessage {
  constructor(body, action) {
    this.msgid = uuid.v1();
    this.createTime = Date.now();
    this.body = body;
    this.action = action;
  }
  toBuffer() {
    let json = { msgid: this.msgid, createTime: this.createTime, action: this.action, body: this.body };
    return new Buffer(JSON.stringify(json));
  }
  static toBuffer(body, action) {
    return new EventMessage(body, action).toBuffer();
  }
  /**  重置项目 */
  static get RESET_PROJECT() { return 'RESET_PROJECT'; }
  /**  重置生产者 */
  static get RESET_PRODUCER() { return 'RESET_PRODUCER'; }
  /** 重置消费者 */
  static get RESET_CONSUMER() { return 'RESET_CONSUMER'; }
  /** 移除消费者 */
  static get DROP_CONSUMER() { return 'DROP_CONSUMER'; }
  /** 移除生产者 */
  static get DROP_PRODUCER() { return 'DROP_PRODUCER'; }
  /** 添加消费者 */
  static get ADD_CONSUMER() { return 'ADD_CONSUMER'; }
  /** 添加生产者 */
  static get ADD_PRODUCER() { return 'ADD_PRODUCER'; }
  /** 心跳 */
  static get KEEPALIVE() { return 'KEEPALIVE'; }
  /** 消息回执 */
  static get MSGRECEIPT() { return 'MSGRECEIPT'; }
}
module.exports = EventMessage;