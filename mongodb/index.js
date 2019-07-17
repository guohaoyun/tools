const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/test';
const logger = console;

async function test() {
  try {
    const client = await MongoClient.connect(url, { useNewUrlParser: true });
    const db = await client.db('test');
    const user = await db.collection('user').findOne({ name: 'Hatchin' });
    logger.log(user);
  } catch (error) {
    logger.log(error);
  }
}

test();