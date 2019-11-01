module.exports = {
  
  httpPort: 8088,
  tcpPort: 8087,
  auth: {
    passport: '57da00080e'
  },
  serverid: '127.0.0.2',
  mongodb: {
    url: 'mongodb://localhost:2001,localhost:2005?replicaSet=rs0',
    dbname: 'mqs'
  },
  connect4local: {
    url: 'amqp://localhost/mqs',
  },

  connect4web: {
    url: 'amqp://localhost/mqs'
  },
};
