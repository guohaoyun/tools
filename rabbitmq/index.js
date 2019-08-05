global.Promise = require('bluebird');
global.logger = console;
global.config = require('./config');
// const amqpServer = require('./core/amqp_server');

const Koa = require('koa');
const app = new Koa();

async function load() {

  await require('./mongodb').MongoClient.connectToMongo();
  const routes = require('./routes');
  // 加载路由中间件
  app.use(routes.routes()).use(routes.allowedMethods());

  app.listen(config.httpPort, () => {
    logger.log(`app is starting at port ${config.httpPort}`);
    logger.info(process.argv);
    require('./core/amqp_server').init(process.argv[2]);
  });

}

load();

