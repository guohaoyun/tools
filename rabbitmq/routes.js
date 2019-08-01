'use strict';
const Router = require('koa-router');
const Consumer = require('./mongodb/consumer');

const router = new Router();
router.get('/api/v1/', async params => {
  const t = await Consumer.find({}).toArray();
  logger.log(t);
});



module.exports = router;
