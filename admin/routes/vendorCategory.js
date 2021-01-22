var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var vendorCategoryApi = require('../app/controllers/vendorCategory-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');

//vendorCategory
router.get('/categoryAdd',login.afterLogin,login.accessControl,vendorCategoryApi.categoryAdd);
router.post('/categoryAddPost',login.afterLogin,vendorCategoryApi.categoryAddPost);
router.get('/categoryList',login.afterLogin,login.accessControl,vendorCategoryApi.categoryList);
router.get('/categoryEdit',login.afterLogin,login.accessControl,vendorCategoryApi.categoryEdit);
router.post('/categoryEditPost',login.afterLogin,vendorCategoryApi.categoryEditPost);
router.post('/updateSorting',login.afterLogin,vendorCategoryApi.updateSorting);
router.get('/changeVendorCategoryStatus',login.afterLogin,login.accessControl,vendorCategoryApi.changeStatus);
router.get('/deleteCategory',login.afterLogin,login.accessControl,vendorCategoryApi.deleteCategory);


module.exports = router;