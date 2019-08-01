'use strict';
const Router = require('koa-router');


const router = new Router();
router.get('/api/v1/', async params => {
  logger.log('test');
});



module.exports = router;
