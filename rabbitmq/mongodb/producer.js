'use strict';
const MongoClient = require('./index').MongoClient;

// 生产者
// publishId: { type: Number, required: true }, // 发布编号
// cmdtype: { type: String, required: true }, // 类型代号
// data: { type: Schema.Types.Mixed, required: true }, // json数据
// version: { type: Number, required: true }, // 版本号
// createTime: { type: Date, required: true }
const Producer = MongoClient.db.collection('tbl_producer');
Producer.createIndex({ publishId: 1, cmdtype: 1, version: -1 });
Producer.createIndex({ version: -1 });

module.exports = Producer;

