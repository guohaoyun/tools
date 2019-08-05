const should = require('should');
const Promise = require('bluebird');
const rp = require('request-promise');
const publishId = 597;
const startProducer = `http://127.0.0.1:7003/publish/change?id=${publishId}&status=4&projectId=2&hxId=1853`;
const stopProducer = `http://127.0.0.1:7003/publish/change?id=${publishId}&status=3&projectId=2&hxId=1853`;
const updatePublish = `http://127.0.0.1:7003/publish/update`;
let mongoClient, db;
  
// 最先运行的before
before(async () => {
  mongoClient = await require('mongodb').MongoClient.connect('mongodb://localhost:2001,localhost:2005?replicaSet=rs0', {
    promiseLibrary: Promise,
    useNewUrlParser: true
  });
  db = mongoClient.db('wntv3');
});

async function init() {
  // 删除所有生产者
  await db.collection('tbl_producer').deleteMany({ publishId });
  // 发布id和消息类型id置为0
  await db.collection('tbl_publish').updateOne({ id: publishId }, { '$set': { lastVersion: 0 } });
  await db.collection('tbl_msgtype').updateMany({ publishId }, { '$set': { lastVersion: 0 } });
}

function stop() {
  after(async () => {
    await rp({ uri: stopProducer, json: true }).catch(e => console.log(e));
  });
}

async function updateVersion(lastVersion) {
  const publish = await db.collection('tbl_publish').findOne({ id: publishId });
  // 修改版本号
  await rp({
    method: 'POST',
    uri: updatePublish,
    json: true,
    body: {
      projectId: 2, hxId: 1853, id: publishId, publishName: publish.publishName, method: publish.method, pullUrl: publish.pullUrl,
      intervalTime: publish.intervalTime, timeout: publish.timeout, warnThreshold: publish.warnThreshold, lastVersion
    }
  }).catch(e => console.log(e));
}

function check() {
  it('总数是100', async () => {
    const count = await db.collection('tbl_producer').countDocuments({ publishId: 597 });
    (count).should.be.exactly(100).and.be.a.Number();
  });

  it('test_sms有44条', async () => {
    const count = await db.collection('tbl_producer').countDocuments({ publishId: 597, cmdtype: 'test_sms' });
    (count).should.be.exactly(44).and.be.a.Number();
  });

  it('test_dc6有56条', async () => {
    const count = await db.collection('tbl_producer').countDocuments({ publishId: 597, cmdtype: 'test_dc6' });
    (count).should.be.exactly(56).and.be.a.Number();
  });
}

// 修改高版本号的拉取结果
function check2() {
  it('总数是30', async () => {
    const count = await db.collection('tbl_producer').countDocuments({ publishId: 597 });
    (count).should.be.exactly(30).and.be.a.Number();
  });

  it('test_sms有12条', async () => {
    const count = await db.collection('tbl_producer').countDocuments({ publishId: 597, cmdtype: 'test_sms' });
    (count).should.be.exactly(12).and.be.a.Number();
  });

  it('test_dc6有18条', async () => {
    const count = await db.collection('tbl_producer').countDocuments({ publishId: 597, cmdtype: 'test_dc6' });
    (count).should.be.exactly(18).and.be.a.Number();
  });
}


describe('1.拉取', () => {
  before(async () => {
    await init();
    // 拉取数据
    await rp({ uri: startProducer, json: true }).catch(e => console.log(e));
    // 等待一下，保证数据全都拉完
    await Promise.delay(6000);
  });

  check();
  stop();

});

describe('2.拉取-暂停-拉取', () => {
  before(async () => {
    await init();
    // 拉取数据
    await rp({ uri: startProducer, json: true }).catch(e => console.log(e));
    // 先拉取2秒
    await Promise.delay(2000);
    // 暂停之后立即又开始
    await rp({ uri: stopProducer, json: true }).catch(e => console.log(e));
    await rp({ uri: startProducer, json: true }).catch(e => console.log(e));
    await Promise.delay(5000);

  });

  check();
  stop();

});

describe('3.拉取-修改版本号（改低）', () => {
  before(async () => {
    await init();
    // 拉取数据
    await rp({ uri: startProducer, json: true }).catch(e => console.log(e));
    // 先拉取2秒
    await Promise.delay(2000);
    await updateVersion(15647);
    await Promise.delay(5000);

  });


  check();
  stop();

});

describe.skip('4.拉取-修改版本号（改高）', () => {
  before(async () => {
    await init();
    // 拉取数据
    await rp({ uri: startProducer, json: true }).catch(e => console.log(e));
    // 先拉取2秒
    await Promise.delay(2000);
    await updateVersion(1564711148090);
    await Promise.delay(5000);

  });

  check2();
  stop();

});

describe('5.拉取-暂停-修改版本号-拉取（改低）', () => {
  before(async () => {
    await init();
    // 拉取数据
    await rp({ uri: startProducer, json: true }).catch(e => console.log(e));
    // 先拉取2秒
    await Promise.delay(2000);
    // 暂停
    await rp({ uri: stopProducer, json: true }).catch(e => console.log(e));
    await updateVersion(15647);
    await rp({ uri: startProducer, json: true }).catch(e => console.log(e));
    await Promise.delay(6000);

  });

  check();
  stop();

});

describe.skip('6.拉取-暂停-修改版本号-拉取（改高）', () => {
  before(async () => {
    await init();
    // 拉取数据
    await rp({ uri: startProducer, json: true }).catch(e => console.log(e));
    // 先拉取2秒
    await Promise.delay(2000);
    // 暂停
    await rp({ uri: stopProducer, json: true }).catch(e => console.log(e));
    await updateVersion(1564711148090);
    await rp({ uri: startProducer, json: true }).catch(e => console.log(e));
    await Promise.delay(6000);

  });

  check2();
  stop();

});



  

  

