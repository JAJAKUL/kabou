var express = require('express');
const { check } = require('express-validator');
var router = express.Router();
var userApi = require('../app/controllers/user-controller');
// var settings = require('../middleware/settings');
var login = require('../middleware/loginCheck');


//Login
router.get('/login',login.beforeLogin,userApi.login);

router.post('/loginSubmit',[
  check('email').not().isEmpty().withMessage('Please provide username.'),
  check('email').isEmail().withMessage('Please provide valid email.'),
  check('password').not().isEmpty().withMessage('Please provide password.')
],userApi.loginPost);

//Forgot password
router.get('/forgotPassword',login.beforeLogin,userApi.forgotPassword);

router.post('/forgotPasswordSubmit',[
  check('email').not().isEmpty().withMessage('Please provide email.'),
  check('email').isEmail().withMessage('Please provide valid email.')
],userApi.forgotPasswordPost);

//Edit Profile
router.get('/editProfile',login.afterLogin,userApi.editProfile);

router.post('/editProfileSubmit',login.afterLogin,[
  check('email').not().isEmpty().withMessage('Please provide email.'),
  check('email').isEmail().withMessage('Please provide valid email.')
],userApi.editProfilePost);

//Edit Profile
router.get('/changePassword',login.afterLogin,userApi.changePassword);

router.post('/changePasswordSubmit',login.afterLogin,userApi.changePasswordPost);

//Logout
router.get('/logout',login.afterLogin,userApi.logout);

module.exports = router;