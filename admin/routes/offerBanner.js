var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var offerBannerApi = require('../app/controllers/offerBanner-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');


//Offer Banner
router.get('/bannerList',login.afterLogin,login.accessControl,offerBannerApi.bannerList);
router.get('/bannerAdd',login.afterLogin,login.accessControl,offerBannerApi.add);
router.post('/addOfferSubmit',login.afterLogin,offerBannerApi.addOfferSubmit);
router.get('/bannerEdit',login.afterLogin,login.accessControl,offerBannerApi.bannerEdit);
router.post('/editOfferSubmit',login.afterLogin,offerBannerApi.editOfferSubmit);
router.get('/deleteBanner',login.afterLogin,login.accessControl,offerBannerApi.deleteBanner);
router.post('/updateSorting',login.afterLogin,offerBannerApi.updateSorting);



module.exports = router;