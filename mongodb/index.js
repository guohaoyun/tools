const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://127.0.0.1:2001,127.0.0.1:2002/test?replicaSet=wntv3_linux';
const logger = console;
const lodash = require('lodash');
async function test() {
  try {
    const client = await MongoClient.connect(url, { useNewUrlParser: true });
    const db = await client.db('test');
    db.createIndex('a_1_b_1_c_1_d_1', { a: 1, b: 1, c: 1, d: 1 })
    let arr = [];
    for (let i = 0; i < 20000000; i++) {
      arr.push({
        insertOne: { 
          a: lodash.random(1, 999999999),
          b: lodash.random(1, 999999999),
          c: lodash.random(1, 999999999),
          d: lodash.random(1, 999999999)
        }
      });
      if (i % 500 === 0) {
        await db.collection('tbl_test').bulkWrite(arr);
        arr = [];
      }
    }
    console.log('done');
    
  } catch (error) {
    logger.log(error);
  }
}

test();