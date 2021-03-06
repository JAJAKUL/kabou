﻿var express = require('express');
var fileUpload = require('express-fileupload');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var fs = require('fs');
var http = require('http');
var https = require('https');
const config = require('./config');
const mongoose = require('mongoose');
var cors = require('cors');
const corsMiddleWare = require('./middlewares/cors-middleware');
var cronFileCommon = require('./modules/cron/common.js');

// cronFileCommon.autoDelayOrder();
// cronFileCommon.createOrder();
// cronFileCommon.paymentTransfer();
// cronFileCommon.completedOrder();
cronFileCommon.oldNotificationDelete();
// cronFileCommon.inactiveVendor();

var app = express();
app.use(cors());

//======== Create Server Starts =======//

if (config.environmentSslFile == '1') {
    var credentials = {
        key: fs.readFileSync(config.sslPath.key, 'utf8'),
        cert: fs.readFileSync(config.sslPath.cert, 'utf8')
    };

    var server = https.createServer(credentials, app);

} else {
    var server = http.createServer(app);
}

//======== Create Server ends =======//

app.use(logger('dev'));


//====== Add Middleware for Rest Starts ======//
app.use(bodyParser.json({extended: true, limit: '200000kb', parameterLimit: 200000 * 100}));
app.use(bodyParser.urlencoded({extended: true, limit: '200000kb', parameterLimit: 200000 * 100}));
app.use(fileUpload());
//====== Add Middleware for Rest Ends ======//

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//===== CORS Support Statrs =====//
app.use(corsMiddleWare);
//===== CORS Support Ends =====//

//==== Load Router =====//
const commonRoutes = require('./routes/common');
app.use('/api', commonRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

const customerRoutes = require('./routes/customers');
app.use('/api/customer',customerRoutes);

const vendorRoutes = require('./routes/vendors');
app.use('/api/vendor',vendorRoutes);

const deliveryboyRoutes = require('./routes/deliveryboy');
app.use('/api/deliveryboy',deliveryboyRoutes);

//===== MongoDB Connection starts =====//
const productionDBString = `mongodb://${config.production.username}:${config.production.password}@${config.production.host}:${config.production.port}/${config.production.dbName}?authSource=${config.production.authDb}`;

var options = {useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true};


mongoose.connect(productionDBString, options, function(err) {
    if(err) {
        console.log('Mongo db connection failed');
    } else {
        console.log('Connected to mongo db');
    }
});

/** Mongo on connection emit */
mongoose.connection.on('connect', function() {
    console.log('Mongo Db connection success');
});

/** Mongo db error emit */
mongoose.connection.on('error', function(err) {
    console.log(`Mongo Db Error ${err}`);
});

/** Mongo db Retry Conneciton */
mongoose.connection.on('disconnected', function() {
    console.log('Mongo db disconnected....trying to reconnect. Please wait.....');
    mongoose.createConnection();
})
//===== MongoDB Connection ends =====//

app.set('port', config.port);
server.listen(app.get('port'), function(err) {
    if (err) {
        throw err;
    } else {
        console.log(`Kabou server is running and listening to ${config.serverhost}:${app.get('port')} `);
    }
});

server.timeout = 500000;
