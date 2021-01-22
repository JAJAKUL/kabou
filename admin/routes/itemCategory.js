var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var itemCategoryApi = require('../app/controllers/itemCategory-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');

//itemCategory
router.get('/itemCategoryAdd',login.afterLogin,login.accessControl,itemCategoryApi.categoryAdd);
router.post('/categoryAddPost',login.afterLogin,itemCategoryApi.categoryAddPost);
router.get('/itemCategoryList',login.afterLogin,login.accessControl,itemCategoryApi.categoryList);
router.get('/categoryEdit',login.afterLogin,login.accessControl,itemCategoryApi.categoryEdit);
router.post('/categoryEditPost',login.afterLogin,itemCategoryApi.categoryEditPost);
router.post('/updateSorting',login.afterLogin,itemCategoryApi.updateSorting);
router.get('/changeItemCategoryStatus',login.afterLogin,login.accessControl,itemCategoryApi.changeStatus);
router.get('/deleteCategory',login.afterLogin,login.accessControl,itemCategoryApi.deleteCategory);


module.exports = router;