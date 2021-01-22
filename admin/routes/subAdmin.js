var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var subAdminApi = require('../app/controllers/subAdmin-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');

//SubAdmin
router.get('/adminAdd',login.afterLogin,login.accessControl,subAdminApi.adminAdd);
router.post('/adminAddPost',login.afterLogin,subAdminApi.adminAddPost);
router.get('/adminList',login.afterLogin,login.accessControl,subAdminApi.adminList);
router.get('/adminEdit',login.afterLogin,login.accessControl,subAdminApi.adminEdit);
router.post('/adminEditPost',login.afterLogin,subAdminApi.adminEditPost);
router.get('/changeSubAdminStatus',login.afterLogin,login.accessControl,subAdminApi.changeStatus);
router.get('/adminDelete',login.afterLogin,login.accessControl,subAdminApi.adminDelete);


module.exports = router;