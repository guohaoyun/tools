'use strict';
// 生产者
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const ProducerSchema = new Schema({
    publishId: { type: Number, required: true }, // 发布编号
    cmdtype: { type: String, required: true }, // 类型代号
    data: { type: Schema.Types.Mixed, required: true }, // json数据
    version: { type: Number, required: true }, // 版本号
    createTime: { type: Date, required: true }
  });
  ProducerSchema.index({ publishId: 1, cmdtype: 1, version: -1 });
  ProducerSchema.index({ version: -1 });
  return mongoose.model('Producer', ProducerSchema, 'tbl_producer');
};
