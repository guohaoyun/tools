'use strict';
const MongoClient = require('./index').MongoClient;

// 消费者
// id: { type: Number, required: true, unique: true }, // 订阅编号，自增
// publishId: { type: Number, required: true }, // 发布编号
// cmdtype: { type: String, required: true }, // 类型代号
// projectId: { type: Number, required: true }, // 本项目id
// lastVersion: { type: Number, required: true }, // 最新版本
// status: { type: Number, required: true }, // 状态 -1已删除 1未授权 2已授权 3未启用 4已启用
// subscribeType: { type: Number, required: true }, // 订阅方式 1服务器推送 2主动拉取（目前只有1）
// method: { type: String, required: true }, // 通讯方式 1GET 2POST （目前只支持GET）
// pushUrl: String, // 推送地址
// backupPushUrl: String, // 备用推送地址
// network: Number, // 网段，保留不使用
// timeout: { type: Number, required: true }, // 超时时间(ms)
// warnThreshold: { type: Number, required: true }, // 告警阈值，-1不告警
// batch: { type: Number, required: true }, // 批量推送数
// pushFail: { type: Number, required: true }, // 如果推送失败 1重试 2跳过该消息（目前只提供1）
// alertUser: Array, // 告警接收人
// alertGroup: Array, // 告警接收群
// createTime: { type: Date, required: true }, // 创建时间
// updateTime: { type: Date, required: true } // 更新时间
const Subscribe = MongoClient.db.collection('tbl_subscribe');
Subscribe.createIndex({ publishId: 1, cmdtype: 1 });

module.exports = Subscribe;
