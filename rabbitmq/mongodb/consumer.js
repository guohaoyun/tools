'use strict';
const MongoClient = require('./index').MongoClient;

// 消费者
// subscribeId: { type: Number, required: true }, // 订阅编号
// publishId: { type: Number, required: true }, // 发布编号
// cmdtype: { type: String, required: true }, // 消息类型代号
// status: { type: Number, required: true }, // 状态 1未发送 2已发送 3已跳过 4推送失败
// version: { type: Number, required: true }, // 版本号
// createTime: { type: Date, required: true }
const Consumer = MongoClient.db.collection('tbl_consumer');
Consumer.createIndex({ subscribeId: -1, publishId: -1, cmdtype: 1, version: -1 });
Consumer.createIndex({ version: -1 });

module.exports = Consumer;
