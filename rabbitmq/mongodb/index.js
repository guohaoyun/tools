class MongoClient {
  static async connectToMongo() {
    if (this.db) return Promise.resolve(this.db);
    return require('mongodb').MongoClient.connect(config.mongodb.url, this.options)
      .then(client => {
        this.db = client.db(config.mongodb.dbname);
        this.client = client;
      });
  }
}

MongoClient.db = null;
MongoClient.client = null;
MongoClient.options = {
  promiseLibrary: Promise,
  useNewUrlParser: true
};

module.exports = { MongoClient };

