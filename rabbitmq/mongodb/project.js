'use strict';
const MongoClient = require('./index').MongoClient;

// 项目
// id: { type: Number, required: true, unique: true },
// name: { type: String, required: true }, // 项目名称
// encryption: { type: String, required: true }, // 加密方式 DES AES BASE64
// key: { type: String, required: true },
// IV: { type: String, required: true },
// createTime: { type: Date, required: true },
// updateTime: { type: Date, required: true } // 更新时间
const Project = MongoClient.db.collection('tbl_project');
Project.createIndex({ createTime: -1 });

module.exports = Project;
