var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var promoCodeApi = require('../app/controllers/promoCode-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');


//Offer Banner
router.get('/promoCodeAdd',login.afterLogin,login.accessControl,promoCodeApi.promoCodeAdd);
router.post('/promoCodeAddPost',login.afterLogin,promoCodeApi.promoCodeAddPost);
router.get('/promoCodeList',login.afterLogin,login.accessControl,promoCodeApi.promoCodeList);
router.get('/deletePromoCode',login.afterLogin,login.accessControl,promoCodeApi.deletePromoCode);
router.get('/promoCodeEdit',login.afterLogin,login.accessControl,promoCodeApi.promoCodeEdit);
router.post('/promoCodeEditPost',login.afterLogin,promoCodeApi.promoCodeEditPost);
router.post('/updateSorting',login.afterLogin,promoCodeApi.updateSorting);


module.exports = router;