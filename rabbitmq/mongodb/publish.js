'use strict';
const MongoClient = require('./index').MongoClient;

// 发布
// id: { type: Number, required: true, unique: true }, // 发布编号，自增
// projectId: { type: Number, required: true }, // 本项目id
// lastVersion: { type: Number, required: true }, // 最新版本
// publishName: { type: String, required: true }, // 发布名称
// status: { type: Number, required: true }, // 状态  -1已删除 3未启用 4已启用
// method: { type: String, required: true }, // 通讯方式 GET POST
// pullUrl: String, // 拉取地址
// backupPullUrl: String, // 备用拉取地址
// network: Number, // 网段，保留不使用
// intervalTime: { type: Number, required: true }, // 定时调用(ms)
// timeout: { type: Number, required: true }, // 超时时间(ms)
// warnThreshold: { type: Number, required: true }, // 告警阈值
// alertUser: Array, // 告警接收人
// alertGroup: Array, // 告警接收群
// createTime: { type: Date, required: true }, // 创建时间
// updateTime: { type: Date, required: true } // 更新时间
const Publish = MongoClient.db.collection('tbl_publish');
Publish.createIndex('publishName');
Publish.createIndex({ createTime: -1 });

module.exports = Publish;


