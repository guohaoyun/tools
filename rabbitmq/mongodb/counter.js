'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const CounterSchema = new Schema({
    _id: String,
    sequence: Number
  });

  CounterSchema.statics.getNextId = async function(name) {
    const r = await this.model('Counter')
      .findOneAndUpdate({ _id: name }, { $inc: { sequence: 1 } }, { new: true, upsert: true });
    return r.sequence;
  };
  return mongoose.model('Counter', CounterSchema, 'tbl_counter');
};
