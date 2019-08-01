const MongoClient = require('mongodb').MongoClient;

exports.connect = async () => {

  try {
    global.mongoClient = await MongoClient.connect(config.mongodbUrl, { useNewUrlParser: true, promiseLibrary: Promise } );
    const db = await mongoClient.db();
    const t = await db.collection('tbl_group').find({}).toArray();
    console.log(t);
  } catch (error) {
    logger.error(`connect to mongodb fail`);
  }
  
};



