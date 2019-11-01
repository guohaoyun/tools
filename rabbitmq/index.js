global.Promise = require('bluebird');
global.config = require('./config');
const log4js = require('log4js');
log4js.configure({
  appenders: { 
    all: { type: 'file', filename: 'mqs', pattern: 'yyyy-MM-dd.log', alwaysIncludePattern: true, level: 'trace' }, 
    console: { type: 'console' }
  },
    
  categories: { default: { appenders: ['all', 'console'], level: 'trace' } }
});
global.logger = log4js.getLogger();

// const amqpServer = require('./core/amqp_server');

const Koa = require('koa');
const app = new Koa();

async function load() {

  await require('./mongodb').MongoClient.connectToMongo();
  require('./core/tcp_server');
  const routes = require('./routes');
  // 加载路由中间件
  app.use(routes.routes()).use(routes.allowedMethods());
  const type = process.argv[2];
  app.listen(config.httpPort, () => {
    logger.info(`${type} is starting at port ${config.httpPort}`);
    // require('./core/amqp_server').init(type);
  });
  // tcpPort
  // tcpServer();
}

load();

