var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var orderApi = require('../app/controllers/order-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');

//Order
router.get('/orderList',login.afterLogin,login.accessControl,orderApi.orderList);
router.get('/orderDetails',login.afterLogin,login.accessControl,orderApi.orderDetails);
router.post('/fetchOrderDetails',login.afterLogin,login.accessControl,orderApi.fetchOrderDetails);
router.post('/cancelOrder',login.afterLogin,login.accessControl,orderApi.cancelOrder);


module.exports = router;