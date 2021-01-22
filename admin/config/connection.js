const mongoose = require('mongoose');
const { DB_HOST, DB_PORT, DB_NAME,DB_USERNAME,DB_PASSWORD,DB_AUTH } = require('./bootstrap');

mongoose.connect(`mongodb://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=${DB_AUTH}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
}, function (err) {
  if (err) {
      console.log('Mongo db connection failed',err);
  } else {
      console.log('Connected to Mongo db');
  }
});


/** Mongo on connection emit */
mongoose.connection.on('connect', function () {
  console.log('Mongo Db connection success');
});

/** Mongo db error emit */
mongoose.connection.on('error', function (err) {
  console.log(`Mongo Db Error ${err}`);
});

/** Mongo db Retry Conneciton */
mongoose.connection.on('disconnected', function () {
  console.log('Mongo db disconnected....trying to reconnect. Please wait.....');
  mongoose.createConnection();
})

module.exports = mongoose;

