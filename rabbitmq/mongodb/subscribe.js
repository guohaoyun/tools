'use strict';
const MongoClient = require('./index').MongoClient;

// 消费者
// id: { type: Number, required: true, unique: true }, // 订阅编号，自增
// publishId: { type: Number, required: true }, // 发布编号
// cmdtype: { type: String, required: true }, // 类型代号
// projectId: { type: Number, required: true }, // 本项目id
// lastVersion: { type: Number, required: true }, // 最新版本
// status: { type: Number, required: true }, // 状态 -1已删除 3未启用 4已启用
// subscribeType: { type: Number, required: true }, // 订阅方式 1服务器推送 2主动拉取（目前只有1）
// pushUrl: String, // 推送地址
// timeout: { type: Number, required: true }, // 超时时间(ms)
// batch: { type: Number, required: true }, // 批量推送数
// createTime: { type: Date, required: true }, // 创建时间
// updateTime: { type: Date, required: true } // 更新时间
const Subscribe = MongoClient.db.collection('tbl_subscribe');
Subscribe.createIndex({ publishId: 1, cmdtype: 1 });

module.exports = Subscribe;
