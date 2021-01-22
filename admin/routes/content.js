var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var contentApi = require('../app/controllers/content-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');

//Content
router.get('/contentList',login.afterLogin,login.accessControl,contentApi.contentList);
router.get('/contentEdit',login.afterLogin,login.accessControl,contentApi.contentEdit);
router.post('/contentEditPost',login.afterLogin,contentApi.contentEditPost);

router.get('/faqList',login.afterLogin,login.accessControl,contentApi.faqList);
router.get('/faqEdit',login.afterLogin,login.accessControl,contentApi.faqEdit);
router.post('/faqEditPost',login.afterLogin,contentApi.faqEditPost);
router.get('/faqAdd',login.afterLogin,login.accessControl,contentApi.faqAdd);
router.post('/faqAddPost',login.afterLogin,contentApi.faqAddPost);
router.get('/deleteFaq',login.afterLogin,login.accessControl,contentApi.deleteFaq);

router.get('/autoNotificationList',login.afterLogin,login.accessControl,contentApi.autoNotificationList);
router.get('/autoNotificationEdit',login.afterLogin,login.accessControl,contentApi.autoNotificationEdit);
router.post('/autoNotificationEditPost',login.afterLogin,contentApi.autoNotificationEditPost);


module.exports = router;