module.exports = {
  
  httpPort: 8088,
  serverid: '127.0.0.2',
  mongodb: {
    url: 'mongodb://localhost:2001,localhost:2005?replicaSet=rs0',
    dbname: 'mqs'
  },
  connect4local: {
    url: 'amqp://localhost',
  },

  connect4web: {
    url: 'amqp://localhost'
  },
};
