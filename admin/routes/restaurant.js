var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var restaurantApi = require('../app/controllers/restaurant-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');


//Restaurant
router.get('/vendorList',login.afterLogin,login.accessControl,restaurantApi.list);
router.get('/changeStatus',login.afterLogin,login.accessControl,restaurantApi.changeStatus);
router.post('/fetchBankAccount',login.afterLogin,restaurantApi.fetchBankAccount);
router.post('/updateBankStatus',login.afterLogin,restaurantApi.updateBankStatus);
router.post('/vendorActiveChange',login.afterLogin,restaurantApi.vendorActiveChange);

router.get('/edit',login.afterLogin,login.accessControl,restaurantApi.edit);
router.post('/editPost',login.afterLogin,restaurantApi.editPost);
router.get('/disableRestaurant',login.afterLogin,restaurantApi.disableRestaurant);
router.get('/disableList',login.afterLogin,login.accessControl,restaurantApi.disableList);
router.get('/deleteImage',login.afterLogin,login.accessControl,restaurantApi.deleteImage);
router.post('/getLogHistory',login.afterLogin,restaurantApi.getLogHistory);

//Setting
router.get('/vendorSetting',login.afterLogin,login.accessControl,restaurantApi.vendorSetting);
router.post('/vendorSettingsPost',login.afterLogin,restaurantApi.vendorSettingsPost);


//Bank
router.get('/bankAccountList',login.afterLogin,login.accessControl,restaurantApi.bankAccountList);
router.get('/changeBankStatus',login.afterLogin,login.accessControl,restaurantApi.changeBankStatus);
router.post('/updateBankCommission',login.afterLogin,login.accessControl,restaurantApi.updateBankCommission);
router.get('/deleteBank',login.afterLogin,login.accessControl,restaurantApi.deleteBank);
router.post('/getBankHistory',login.afterLogin,restaurantApi.getBankHistory);

//Item
router.get('/unapprovedItemList',login.afterLogin,login.accessControl,restaurantApi.unapprovedItemList);
router.get('/itemList',login.afterLogin,login.accessControl,restaurantApi.itemList);
router.get('/changeItemApprove',login.afterLogin,login.accessControl,restaurantApi.changeItemApprove);
router.post('/fetchMenuDetails',login.afterLogin,restaurantApi.fetchMenuDetails);
router.get('/itemEdit',login.afterLogin,login.accessControl,restaurantApi.itemEdit);
router.post('/itemEditPost',login.afterLogin,restaurantApi.itemEditPost);
router.get('/itemDelete',login.afterLogin,login.accessControl,restaurantApi.itemDelete);

router.get('/itemAdd',login.afterLogin,login.accessControl,restaurantApi.itemAdd);
router.post('/itemAddPost',login.afterLogin,restaurantApi.itemAddPost);

//Notification
router.get('/sendPushMessage',login.afterLogin,login.accessControl,restaurantApi.sendPushMessage);
router.all('/sendPushPost',login.afterLogin,restaurantApi.sendPushPost);
router.get('/vendorNotificationList',login.afterLogin,login.accessControl,restaurantApi.vendorNotificationList);
router.get('/vendorDeleteNotification',login.afterLogin,login.accessControl,restaurantApi.deleteNotification);
router.get('/vendorNotificationEdit',login.afterLogin,login.accessControl,restaurantApi.vendorNotificationEdit);
router.post('/vendorNotificationEditPost',login.afterLogin,restaurantApi.vendorNotificationEditPost);

module.exports = router;