var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var http = require('http');
var https = require('https');

var indexRouter = require('./routes/index');
var userRouter = require('./routes/user');
var restaurantRouter = require('./routes/restaurant');
var offerBannerRouter = require('./routes/offerBanner');
var paymentRouter = require('./routes/payment');
var subAdminRouter = require('./routes/subAdmin');
var vendorCategoryRouter = require('./routes/vendorCategory');
var itemCategoryRouter = require('./routes/itemCategory');
var contentRouter = require('./routes/content');
var promoCodeRouter = require('./routes/promoCode');
var adminSettingRouter = require('./routes/adminSetting');

var customerRouter = require('./routes/customer');
var orderRouter = require('./routes/order');
var reviewRouter = require('./routes/review');

var app = express(),
  engine = require('ejs-mate');

app.use(bodyParser.json({ extended: true, limit: '200000kb', parameterLimit: 200000 * 100 }));
app.use(bodyParser.urlencoded({ extended: true, limit: '200000kb', parameterLimit: 200000 * 100 }));
app.use(fileUpload());


const { SESSION_SECRET, PORT, ENVIRONMENT, HOST } = require('./config/bootstrap');

//Mongo Db
require('./config/connection');

//Session
var session = require('express-session');
var MemoryStore = require('memorystore')(session);
//Flash
var flash = require('express-flash');

// view engine setup
app.engine('ejs', engine);
app.set('views', path.join(__dirname, 'app/views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Express Session

// Session 
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: SESSION_SECRET,
  resave: true,
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  saveUninitialized: true,
  rolling: true, // <-- Set `rolling` to `true`
  cookie: { maxAge: Date.now() + (30 * 86400 * 1000) }
}));

//Flash Message
app.use(flash());


app.use('/', indexRouter);
app.use('/user/', userRouter);
app.use('/restaurant/', restaurantRouter);
app.use('/offerBanner/', offerBannerRouter);
app.use('/payment/', paymentRouter);
app.use('/subAdmin/', subAdminRouter);
app.use('/vendorCategory/', vendorCategoryRouter);
app.use('/itemCategory/', itemCategoryRouter);
app.use('/content/', contentRouter);
app.use('/promoCode/', promoCodeRouter);
app.use('/adminSetting/', adminSettingRouter);

app.use('/customer/', customerRouter);
app.use('/order/', orderRouter);
app.use('/review/', reviewRouter);



// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



if (ENVIRONMENT == 'staging') {
  var credentials = {
    key: fs.readFileSync('/etc/letsencrypt/live/nodeserver.brainiuminfotech.com/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/nodeserver.brainiuminfotech.com/fullchain.pem', 'utf8')
  };

  var server = https.createServer(credentials, app);

} else if (ENVIRONMENT == 'development') {
  var server = http.createServer(app);
}

// middleware to make 'user' available to all templates
app.use(function (req, res, next) {
  res.locals.user = req.session.user;
  next();
});

app.set('port', PORT);
server.listen(app.get('port'), function (err) {
  if (err) {
    throw err;
  } else {
    console.log(`Kabou admin server is running and listening to ${HOST}:${app.get('port')} `);
  }
});


module.exports = app;
