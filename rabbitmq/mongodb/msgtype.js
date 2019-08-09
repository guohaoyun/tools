'use strict';
const MongoClient = require('./index').MongoClient;

// 消息类型
// id: { type: Number, required: true, unique: true },
// publishId: { type: Number, required: true }, // 发布编号
// cmdtype: { type: String, required: true }, // 类型代号
// lastVersion: { type: Number, required: true }, // 最新版本
// status: Number, // 状态 1启用 -1已删除
// createTime: { type: Date, required: true },
// updateTime: { type: Date, required: true } // 更新时间
const Msgtype = MongoClient.db.collection('tbl_msgtype');
Msgtype.createIndex({ publishId: 1, cmdtype: 1, version: -1 });
Msgtype.createIndex({ version: -1 });

module.exports = Msgtype;


