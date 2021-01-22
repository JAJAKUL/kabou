var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var reviewApi = require('../app/controllers/review-controller');
var login = require('../middleware/loginCheck');

//Review
router.get('/reviewList',login.afterLogin,login.accessControl,reviewApi.reviewList);
router.get('/reviewDelete',login.afterLogin,login.accessControl,reviewApi.reviewDelete);

router.get('/reviewEdit',login.afterLogin,login.accessControl,reviewApi.reviewEdit);
router.post('/reviewEditPost',login.afterLogin,login.accessControl,reviewApi.reviewEditPost);

module.exports = router;