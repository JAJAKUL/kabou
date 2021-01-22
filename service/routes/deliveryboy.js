'use strict';
var express = require('express');
const config = require('../config');

const deliveryBoyValidator = require('../middlewares/validators/deliveryboy/customer-validator');
const registerService = require('../services/deliveryboy/register-service');

const dashboardValidator = require('../middlewares/validators/deliveryboy/dashboard-validator');
const dashboardService = require('../services/deliveryboy/dashboard-service');

const jwtTokenValidator = require('../middlewares/jwt-validation-middlewares');

var customerApi = express.Router();
customerApi.use(express.json());
customerApi.use(express.urlencoded({extended: false}));

/** Customer registration */
customerApi.post('/register', deliveryBoyValidator.customerRegister, function(req, res) {
    registerService.customerRegister(req, function(result) {
        res.status(200).send(result);
    })
});


/** Customer Login */
customerApi.post('/login', deliveryBoyValidator.customerLogin, function(req, res) {
    registerService.customerLogin(req.body, function(result) {
        res.status(200).send(result);
    })
});

/** Customer Verify OTP */
customerApi.post('/customerVerifyUser', deliveryBoyValidator.customerVerifyUser, function(req, res) {
    registerService.customerVerifyUser(req, function(result) {
        res.status(200).send(result);
    })
});

/** Forgot Password */
customerApi.post('/forgotPassword', deliveryBoyValidator.forgotPasswordEmail, function(req, res) {
    registerService.forgotPassword(req.body, function(result) {
        res.status(200).send(result);
    })
});

/** Reset Password */
customerApi.post('/resetPassword', deliveryBoyValidator.resetPassword, function(req, res) {
    registerService.resetPassword(req.body, function(result) {
        res.status(200).send(result);
    });
});

/** Resend Forgot Password OTP */
customerApi.post('/resendForgotPassOtp', deliveryBoyValidator.resendForgotPassOtp, function(req, res) {
    registerService.resendForgotPassordOtp(req.body, function(result) {
        res.status(200).send(result);
    });
})

//AFTER LOGIN 
/** View Profile */
customerApi.post('/viewProfile',jwtTokenValidator.validateToken, deliveryBoyValidator.viewProfile, function(req, res) {
    registerService.viewProfile(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Edit Profile */
customerApi.post('/editProfile',jwtTokenValidator.validateToken, deliveryBoyValidator.editProfile, function(req, res) {
    registerService.editProfile(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Change password */
customerApi.post('/changePassword',jwtTokenValidator.validateToken, deliveryBoyValidator.changePassword, function(req, res) {
    registerService.changePassword(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Number plate image upload */
customerApi.post('/numberPlateImageUpload',jwtTokenValidator.validateToken,deliveryBoyValidator.numberPlateImageUpload, function(req, res) {
    registerService.numberPlateImageUpload(req, function(result) {
        res.status(200).send(result);
    });
})

/** License image upload */
customerApi.post('/licenceImageUpload',jwtTokenValidator.validateToken,deliveryBoyValidator.licenceImageUpload, function(req, res) {
    registerService.licenceImageUpload(req, function(result) {
        res.status(200).send(result);
    });
});

/** License image upload */
customerApi.post('/profileImageUpload',jwtTokenValidator.validateToken,deliveryBoyValidator.licenceImageUpload, function(req, res) {
    registerService.profileImageUpload(req, function(result) {
        res.status(200).send(result);
    });
});

/** Logout */
customerApi.post('/logout',jwtTokenValidator.validateToken, deliveryBoyValidator.logout, function(req, res) {
    registerService.logout(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Verify Infor Before Changing Email/Phone */
customerApi.post('/verifyUser',jwtTokenValidator.validateToken, deliveryBoyValidator.verifyUser, function(req, res) {
    registerService.verifyUser(req, function(result) {
        res.status(200).send(result);
    })
});

/** Update Vendor Email */
customerApi.post('/updateUserEmail',jwtTokenValidator.validateToken, deliveryBoyValidator.updateUserEmail, function(req, res) {
    registerService.updateUserEmail(req, function(result) {
        res.status(200).send(result);
    })
});

/** Update Vendor Phone */
customerApi.post('/updateUserPhone',jwtTokenValidator.validateToken, deliveryBoyValidator.updateUserPhone, function(req, res) {
    registerService.updateUserPhone(req, function(result) {
        res.status(200).send(result);
    })
});

/** Forgot Email */
customerApi.post('/forgotEmail', deliveryBoyValidator.forgotEmail, function(req, res) {
    registerService.forgotEmail(req.body, function(result) {
        res.status(200).send(result);
    })
});

/** Home */
customerApi.post('/dashboard',jwtTokenValidator.validateToken, dashboardValidator.dashboard, function(req, res) {
    dashboardService.dashboard(req, function(result) {
        res.status(200).send(result);
    })
});

/** availability Change */
customerApi.post('/availabilityChange',jwtTokenValidator.validateToken, dashboardValidator.availabilityChange, function(req, res) {
    dashboardService.availabilityChange(req, function(result) {
        res.status(200).send(result);
    })
});

/** accept Reject Change */
customerApi.post('/acceptRejectChange',jwtTokenValidator.validateToken, dashboardValidator.acceptRejectChange, function(req, res) {
    dashboardService.acceptRejectChange(req, function(result) {
        res.status(200).send(result);
    })
});

/** order Details */
customerApi.post('/orderDetails',jwtTokenValidator.validateToken, dashboardValidator.orderDetails, function(req, res) {
    dashboardService.orderDetails(req, function(result) {
        res.status(200).send(result);
    })
});

/** Track order */
customerApi.post('/trackOrder',jwtTokenValidator.validateToken, dashboardValidator.orderDetails, function(req, res) {
    dashboardService.trackOrder(req, function(result) {
        res.status(200).send(result);
    })
});

/** Post Lat long */
customerApi.post('/postLatLong',jwtTokenValidator.validateToken, dashboardValidator.postLatLong, function(req, res) {
    dashboardService.postLatLong(req, function(result) {
        res.status(200).send(result);
    })
});

/** order status */
customerApi.post('/orderStatus',jwtTokenValidator.validateToken, dashboardValidator.orderStatus, function(req, res) {
    dashboardService.orderStatus(req, function(result) {
        res.status(200).send(result);
    })
});


module.exports = customerApi;