'use strict';
// 消息类型
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const MsgtypeSchema = new Schema({
    id: { type: Number, required: true, unique: true },
    publishId: { type: Number, required: true }, // 发布编号
    cmdtype: { type: String, required: true }, // 类型代号
    lastVersion: { type: Number, required: true }, // 最新版本
    description: String, // 类型描述
    status: Number, // 状态 1启用 -1已删除
    createTime: { type: Date, required: true },
    updateTime: { type: Date, required: true } // 更新时间
  });
  MsgtypeSchema.index({ publishId: -1, cmdtype: -1, lastVersion: -1 });
  MsgtypeSchema.index('description');

  return mongoose.model('Msgtype', MsgtypeSchema, 'tbl_msgtype');
};
