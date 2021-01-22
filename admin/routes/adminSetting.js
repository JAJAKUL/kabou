var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var adminSettingApi = require('../app/controllers/adminSetting-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');

//adminSetting
router.get('/settingsEdit',login.afterLogin,login.accessControl,adminSettingApi.settingsEdit);
router.post('/settingsEditPost',login.afterLogin,adminSettingApi.settingsEditPost);


module.exports = router;