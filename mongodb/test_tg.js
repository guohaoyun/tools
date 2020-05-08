const MongoClient = require('mongodb').MongoClient;
const mongoUrl = 'mongodb://mongodb_u_dc6:2282fee7700d468da93fa8a5e6b3e2da@10.82.195.90:27017,10.82.195.95:27017,10.85.204.20:27017/dc6?replicaSet=dc6';
const fs = require('fs');
async function test() {
  try {
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true });
    const db = await client.db('dc6');
    const tbl_tg_one = await db.collection('tbl_tg_one').find({ status: { '$in': [1, 4] } }).toArray();
    for (const record of tbl_tg_one) {
      const { email, dytnumber, imcode } = record;
      if (dytnumber) {
        fs.writeFile('./testgold_in_use', `${email},${dytnumber},${imcode}\n`, { flag: 'a' });
      }
    }
  } catch (error) {
    logger.log(error);
  }
}

test();