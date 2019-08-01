'use strict';
// 消费者
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const ConsumerSchema = new Schema({
    subscribeId: { type: Number, required: true }, // 订阅编号
    publishId: { type: Number, required: true }, // 发布编号
    cmdtype: { type: String, required: true }, // 消息类型代号
    status: { type: Number, required: true }, // 状态 1未发送 2已发送 3已跳过 4推送失败
    version: { type: Number, required: true }, // 版本号
    createTime: { type: Date, required: true }
  });
  ConsumerSchema.index({ subscribeId: -1, publishId: -1, cmdtype: 1, version: -1 });
  ConsumerSchema.index({ version: -1 });

  return mongoose.model('Consumer', ConsumerSchema, 'tbl_consumer');
};
