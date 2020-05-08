const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:2001/wntv3';

// 21859429
async function count() {
  const map = Object.create(null);
  let startTime = new Date('2020-01-01 00:00:00').getTime();
  try {
    const client = await MongoClient.connect(url, { useNewUrlParser: true });
    const db = await client.db('wntv3');
    const ONE_HOME = 1000 * 60 * 60;
    let breakout = false;
    while (!breakout) {
      const result = await db.collection('sms_send')
        .count({ createtime: { '$gte': new Date(startTime), '$lt': new Date(startTime+ONE_HOME) }, pname: 'dyy' });
      if (!map[new Date(startTime).getMonth() + 1]) {
        map[new Date(startTime).getMonth() + 1] = 0;
      }
      map[new Date(startTime).getMonth() + 1] += result;
      startTime = startTime + ONE_HOME;
      console.log(map);
      console.log(startTime);
      
    }
  } catch (error) {
    console.log(`error ${startTime}`, error);
  }
}
async function getFirst() {
  try {
    const client = await MongoClient.connect(url, { useNewUrlParser: true });
    const db = await client.db('wntv3');
    const records = await db.collection('sms_send')
      .find({ createtime: { '$gte': new Date('2020-01-01 00:00:00'), '$lte': new Date('2020-01-01 00:00:01') } })
      .sort({ pkid: 1 }).limit(1).toArray();
    console.log(records[0].createtime);
    console.log(records[0].pkid);
  } catch (error) {
    console.log(error);
  }
}
count();
// getFirst();