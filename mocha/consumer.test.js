// --no-timeout
var assert = require('assert');
var should = require('should');
const Promise = require('bluebird');
const rp = require('request-promise');
const ids = [182, 183];
const startConsumer183 = 'http://127.0.0.1:7003/subscribe/change?id=183&status=4&projectId=2&hxId=1853';
const startConsumer182 = 'http://127.0.0.1:7003/subscribe/change?id=182&status=4&projectId=2&hxId=1853';
const stopConsumer183 = 'http://127.0.0.1:7003/subscribe/change?id=183&status=3&projectId=2&hxId=1853';
const stopConsumer182 = 'http://127.0.0.1:7003/subscribe/change?id=182&status=3&projectId=2&hxId=1853';
let mongoClient, db;

before(async () => {
  mongoClient = await require('mongodb').MongoClient.connect('mongodb://localhost:2001,localhost:2005?replicaSet=rs0', {
    promiseLibrary: Promise,
    useNewUrlParser: true
  });
  db = mongoClient.db('wntv3');

  // await init();
});


async function init() {
  // 删除所有消费者
  await db.collection('tbl_consumer').deleteMany({ subscribeId: { '$in': ids } });
  // 订阅版本号置为0
  await db.collection('tbl_subscribe').updateMany({ id: { '$in': ids } }, { '$set': { lastVersion: 0, batch: 2 } });
  // 业务方数据清空
  await db.collection('tbl_mqs_subscribe').updateMany({}, { '$set': { isDelete: false } });
}

async function check() {
  it('test_sms有44条', async () => {
    const count = await db.collection('tbl_consumer').countDocuments({ subscribeId: { '$in': ids }, cmdtype: 'test_sms' });
    (count).should.be.exactly(44).and.be.a.Number();
  });

  it('test_dc6有56条', async () => {
    const count = await db.collection('tbl_consumer').countDocuments({ subscribeId: { '$in': ids }, cmdtype: 'test_dc6' });
    (count).should.be.exactly(56).and.be.a.Number();
  });
}

// 改为批量推送
async function change2Batch() {
  const subscribe182 = await db.collection('tbl_subscribe').findOne({ id: 182 });
  const subscribe183 = await db.collection('tbl_subscribe').findOne({ id: 183 });
  await rp({
    method: 'POST',
    uri: 'http://127.0.0.1:7003/subscribe/update',
    json: true,
    body: {
      projectId: 2, hxId: 1853, id: 182, method: subscribe182.method, pushUrl: subscribe182.pushUrl,
      lastVersion: subscribe182.lastVersion, timeout: subscribe182.timeout, warnThreshold: subscribe182.warnThreshold, batch: 5,
      pushFail: 1
    }
  });
  
  await rp({
    method: 'POST',
    uri: 'http://127.0.0.1:7003/subscribe/update',
    json: true,
    body: {
      projectId: 2, hxId: 1853, id: 183, method: subscribe183.method, pushUrl: subscribe183.pushUrl,
      lastVersion: subscribe183.lastVersion, timeout: subscribe183.timeout, warnThreshold: subscribe183.warnThreshold, batch: 5,
      pushFail: 1
    }
  });
}

async function start() {
  await rp({ uri: startConsumer183, json: true });
  await rp({ uri: startConsumer182, json: true });
}

async function stop() {
  await rp({ uri: stopConsumer183, json: true });
  await rp({ uri: stopConsumer182, json: true });
}

describe('消费历史所有（单条推送）', async () => {
  before(async () => {
    try {
      await init();
      await start();
      await Promise.delay(2500);
      await stop();
    } catch (error) {
      console.log(error);
    }
    
  });
  check();
});

describe('消费历史所有（多条推送）', () => {
  before(async () => {
    try {
      await init();
      await change2Batch();
      await start();
      await Promise.delay(1000);
      await stop();
    } catch (error) {
      console.log(error);
    }
    
  });
  check();
});

describe('消费-暂停-消费（单条推送）', async () => {
  before(async () => {
    try {
      await init();
      await start();
      await Promise.delay(500);
      await stop();
      await Promise.delay(500);
      await start();
      await Promise.delay(2500);
    } catch (error) {
      console.log(error);
    }
  });
  check();
});

describe('消费-暂停-消费（多条推送）', async () => {
  before(async () => {
    try {
      await init();
      await change2Batch();
      await start();
      await Promise.delay(100);
      await stop();
      await Promise.delay(100);
      await start();
      await Promise.delay(1000);
    } catch (error) {
      console.log(error);
    }
  });
  check();
});