const amqp = require('amqplib');

module.exports = {
  createConfirmChannel: async function() {
    // amqp://wntuser:1S01e9dDa77b0Ade9@10.82.194.80/wntv3?heartbeat=30
    const connection = await amqp.connect('amqp://localhost/wntv3');
    // const connection = await amqp.connect('amqp://ghy:ghy@10.32.4.120?heartbeat=30');
    return connection.createConfirmChannel();
  }
};