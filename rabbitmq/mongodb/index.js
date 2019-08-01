class MongoClient {
  static async connectToMongo() {
    if (this.db) return Promise.resolve(this.db);
    return require('mongodb').MongoClient.connect(this.url, this.options)
      .then(client => this.db = client.db(config.mongodb.dbname));
  }
}

MongoClient.db = null;
MongoClient.url = config.mongodb.url;
MongoClient.options = {
  promiseLibrary: Promise,
  useNewUrlParser: true
};

module.exports = { MongoClient };

