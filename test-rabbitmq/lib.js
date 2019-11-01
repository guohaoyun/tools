const amqp = require('amqplib');

function runtimeError(err) {
  console.log(`AMQP has runtime error : ${err} `);
}

module.exports = {
  createConfirmChannel: async function() {
    const connection = await amqp.connect('amqp://localhost/wntv3');
    return connection.createConfirmChannel().then(ch => {
      const closeError = () => runtimeError('confirm channel is close');
      ch.on('error', err => runtimeError(err));
      ch.once('close', closeError);
      // 自定义的关闭
      return ch;
    }).catch(err => {
      console.log(`create confirm channel error : ${err}`);
      return false;
    });
  }
};