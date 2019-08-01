const Koa = require('koa');
const app = new Koa();
const routes = require('./routes');
require('./mongodb').connect();

global.Promise = require('bluebird');
global.logger = console;

// 加载路由中间件
app.use(routes.routes()).use(routes.allowedMethods());

app.listen(config.httpPort, () => {
  logger.log(`app is starting at port ${config.httpPort}`);
});