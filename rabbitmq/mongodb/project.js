'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const ProjectSchema = new Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true }, // 项目名称
    gate: { type: String, required: true, unique: true }, // 项目代号
    description: String, // 项目简介
    encryption: { type: String, required: true }, // 加密方式 DES AES BASE64
    key: { type: String, required: true },
    IV: { type: String, required: true },
    servers: Array,
    leaders: { type: Array, required: true }, // 存储负责人的火星号
    members: Array, // 存储成员火星号
    status: Number, // 状态 -1已删除 1在用
    createTime: { type: Date, required: true },
    updateTime: { type: Date, required: true } // 更新时间
  });
  ProjectSchema.index({ createTime: -1 });

  return mongoose.model('Project', ProjectSchema, 'tbl_project');
};