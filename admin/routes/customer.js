var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var customerApi = require('../app/controllers/customer-controller');
var login = require('../middleware/loginCheck');
 

//Customer
router.get('/customerList',login.afterLogin,login.accessControl,customerApi.customerList);
router.get('/customerChangeStatus',login.afterLogin,login.accessControl,customerApi.customerChangeStatus);
router.get('/customerEdit',login.afterLogin,login.accessControl,customerApi.customerEdit);
router.post('/customerEditPost',login.afterLogin,customerApi.customerEditPost);
router.get('/customerDelete',login.afterLogin,customerApi.customerDelete);

//Notification
router.get('/customerSendPushMessage',login.afterLogin,login.accessControl,customerApi.customerSendPushMessage);
router.all('/customerSendPushPost',login.afterLogin,customerApi.customerSendPushPost);
router.get('/customerNotificationList',login.afterLogin,login.accessControl,customerApi.customerNotificationList);
router.get('/customerDeleteNotification',login.afterLogin,login.accessControl,customerApi.customerDeleteNotification);
router.get('/customerNotificationEdit',login.afterLogin,login.accessControl,customerApi.customerNotificationEdit);
router.post('/customerNotificationEditPost',login.afterLogin,customerApi.customerNotificationEditPost);

router.post('/getLogHistory',login.afterLogin,customerApi.getLogHistory);

module.exports = router;