var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var paymentApi = require('../app/controllers/payment-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');

//Payment
router.get('/paymentList',login.afterLogin,login.accessControl,paymentApi.paymentList);
router.post('/sendReceiptEmail',login.afterLogin,paymentApi.sendReceiptEmail);
router.post('/sendVendorAmount',login.afterLogin,paymentApi.sendVendorAmount);
router.post('/sendOTP',login.afterLogin,paymentApi.sendOTP);


module.exports = router;