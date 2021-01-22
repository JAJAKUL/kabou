 var express = require('express');
 const { check } = require('express-validator');
 var router = express.Router();
 var mainApi = require('../app/controllers/index-controller');
// var settings = require('../middleware/settings');
 var login = require('../middleware/loginCheck');
const { endpoint, masterKey, port } = require('../config/bootstrap');

// //Home Page
 router.get('/',mainApi.home);

 // //Home Page
 router.get('/dashboard',login.afterLogin,mainApi.dashboard);

  // //Home Page
  router.get('/noAccess',login.afterLogin,mainApi.noAccess);

  router.post('/getNotification',login.afterLogin,mainApi.getNotification);

  router.get('/adminNotificationList',login.afterLogin,mainApi.adminNotificationList);
  router.get('/adminDeleteNotification',login.afterLogin,mainApi.adminDeleteNotification);
  router.post('/updateNotification',login.afterLogin,mainApi.updateNotification);


 module.exports = router;
