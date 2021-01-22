'use strict';
var express = require('express');
const config = require('../config');
const registerService = require('../services/customer/register-service');
const restaurantService = require('../services/customer/restaurant-service');
const paymentService = require('../services/payment-service');
const deliveryService = require('../services/delivery-service');
const orderService = require('../services/customer/order-service');
const customerValidator = require('../middlewares/validators/customer/customer-validator');
const restaurantValidator = require('../middlewares/validators/customer/restaurant-validator');
const paymentValidator = require('../middlewares/validators/customer/payment-validator');
const deliveryValidator = require('../middlewares/validators/customer/delivery-validator');

const jwtTokenValidator = require('../middlewares/jwt-validation-middlewares');

var customerApi = express.Router();
customerApi.use(express.json());
customerApi.use(express.urlencoded({extended: false}));

/** Customer registration */
customerApi.post('/register', customerValidator.customerRegister, function(req, res) {
    registerService.customerRegister(req.body, function(result) {
        res.status(200).send(result);
    })
});


/** Customer Login */
customerApi.post('/login', customerValidator.customerLogin, function(req, res) {
    registerService.customerLogin(req.body, function(result) {
        res.status(200).send(result);
    })
});

/** Customer Verify OTP */
customerApi.post('/customerVerifyUser', customerValidator.customerVerifyUser, function(req, res) {
    registerService.customerVerifyUser(req, function(result) {
        res.status(200).send(result);
    })
});

/** Forgot Password */
customerApi.post('/forgotPassword', customerValidator.forgotPasswordEmail, function(req, res) {
    registerService.forgotPassword(req.body, function(result) {
        res.status(200).send(result);
    })
});

/** Reset Password */
customerApi.post('/resetPassword', customerValidator.resetPassword, function(req, res) {
    registerService.resetPassword(req.body, function(result) {
        res.status(200).send(result);
    });
});

/** Resend Forgot Password OTP */
customerApi.post('/resendForgotPassOtp', customerValidator.resendForgotPassOtp, function(req, res) {
    registerService.resendForgotPassordOtp(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Forgot Password Admin */
customerApi.post('/forgotPasswordAdmin', customerValidator.forgotPasswordEmail, function(req, res) {
    registerService.forgotPasswordAdmin(req.body, function(result) {
        res.status(200).send(result);
    })
});

/** Reset Password Admin */
customerApi.post('/resetPasswordAdmin', customerValidator.resetPasswordAdmin, function(req, res) {
    registerService.resetPasswordAdmin(req.body, function(result) {
        res.status(200).send(result);
    });
});

/** Change password Admin */
customerApi.post('/changePasswordAdmin',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer, customerValidator.changePassword, function(req, res) {
    registerService.changePasswordAdmin(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** View Profile */
customerApi.post('/viewProfile',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer, customerValidator.viewProfile, function(req, res) {
    registerService.viewProfile(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Edit Profile */
customerApi.post('/editProfile',jwtTokenValidator.validateToken, customerValidator.editProfile, function(req, res) {
    registerService.editProfile(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Change password */
customerApi.post('/changePassword',jwtTokenValidator.validateToken, customerValidator.changePassword, function(req, res) {
    registerService.changePassword(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Profile image upload */
customerApi.post('/profileImageUpload',jwtTokenValidator.validateToken,customerValidator.profileImageUpload, function(req, res) {
    registerService.profileImageUpload(req, function(result) {
        res.status(200).send(result);
    });
})


/** Change password */
customerApi.post('/logout',jwtTokenValidator.validateToken, customerValidator.logout, function(req, res) {
    registerService.logout(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Change password */
customerApi.post('/devicePush',jwtTokenValidator.validateToken, customerValidator.devicePush, function(req, res) {
    registerService.devicePush(req.body, function(result) {
        res.status(200).send(result);
    });
});


/** Verify Infor Before Changing Email/Phone */
customerApi.post('/verifyUser',jwtTokenValidator.validateToken, customerValidator.verifyUser, function(req, res) {
    registerService.verifyUser(req, function(result) {
        res.status(200).send(result);
    })
});

/** Update Vendor Email */
customerApi.post('/updateUserEmail',jwtTokenValidator.validateToken, customerValidator.updateUserEmail, function(req, res) {
    registerService.updateUserEmail(req, function(result) {
        res.status(200).send(result);
    })
});

/** Update Vendor Phone */
customerApi.post('/updateUserPhone',jwtTokenValidator.validateToken, customerValidator.updateUserPhone, function(req, res) {
    registerService.updateUserPhone(req, function(result) {
        res.status(200).send(result);
    })
});

/** Home/Dashboard */
customerApi.post('/dashboard',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.customerHomeValidator, function(req, res) {
    restaurantService.customerHome(req, function(result) {
        res.status(200).send(result);
    });
});


/** Restaurant Details */
customerApi.post('/vendorDetails',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.restaurantDetailsValidator, function(req, res) {
    restaurantService.restaurantDetails(req.body, function(result) {
        res.status(200).send(result);
    });
});

/** Home/Dashboard */
customerApi.post('/vendorCategories',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.vendorCategories, function(req, res) {
    restaurantService.vendorCategories(req, function(result) {
        res.status(200).send(result);
    });
});

/** Banner Restaurant List */
customerApi.post('/bannerVendorList',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.bannerVendorList, function(req, res) {
    restaurantService.bannerVendorList(req, function(result) {
        res.status(200).send(result);
    });
});

/** Order Submit */
customerApi.post('/postOrder',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.postOrderValidator, function(req, res) {
    restaurantService.postOrder(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Cart Order Validation */
customerApi.post('/cartOrderValidation',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.cartOrderValidation, function(req, res) {
    restaurantService.cartOrderValidation(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Order Submit */
customerApi.post('/submitReview',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.submitReview, function(req, res) {
    restaurantService.submitReview(req.body, function(result) {
        res.status(200).send(result);
    });
})


/** Add Address */
customerApi.post('/addAddress',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.addAddress, function(req, res) {
    restaurantService.addAddress(req, function(result) {
        res.status(200).send(result);
    });
});

/** Edit Address */
customerApi.post('/editAddress',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.editAddress, function(req, res) {
    restaurantService.editAddress(req, function(result) {
        res.status(200).send(result);
    });
});

/** List Address */
customerApi.post('/listAddress',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.listAddress, function(req, res) {
    restaurantService.listAddress(req, function(result) {
        res.status(200).send(result);
    });
});

/** Delete Address */
customerApi.post('/deleteAddress',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.deleteAddress, function(req, res) {
    restaurantService.deleteAddress(req, function(result) {
        res.status(200).send(result);
    });
});

/** Search */
customerApi.post('/search',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.customerSearchValidator, function(req, res) {
    restaurantService.customerSearch(req, function(result) {
        res.status(200).send(result);
    });
})

/** Order List */
customerApi.post('/orderList',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.customerOrderListValidator, function(req, res) {
    orderService.orderList(req, function(result) {
        res.status(200).send(result);
    });
});

/** Order Details */
customerApi.post('/orderDetails',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.customerOrderDetailsValidator, function(req, res) {
    orderService.orderDetails(req, function(result) {
        res.status(200).send(result);
    });
});

/** Order Cancel */
customerApi.post('/orderCancel',jwtTokenValidator.validateToken,restaurantValidator.customerOrderDetailsValidator, function(req, res) {
    orderService.orderCancel(req, function(result) {
        res.status(200).send(result);
    });
})


/** Order Submit */
customerApi.post('/orderSubmitReview',jwtTokenValidator.validateToken,restaurantValidator.orderSubmitReview, function(req, res) {
    orderService.orderSubmitReview(req.body, function(result) {
        res.status(200).send(result);
    });
})

/** Get Vendor Reviews */
customerApi.post('/getReviews', jwtTokenValidator.validateToken, restaurantValidator.getVendorDetails, function (req, res) {
    orderService.getReviews(req, function (result) {
        res.status(200).send(result);
    })
});

// /** Order Cancel */
// customerApi.post('/reOrder',jwtTokenValidator.validateToken,restaurantValidator.customerOrderDetailsValidator, function(req, res) {
//     orderService.reOrder(req, function(result) {
//         res.status(200).send(result);
//     });
// })


/** All promo List */
customerApi.post('/promoCodeList',jwtTokenValidator.validateToken,jwtTokenValidator.checkCustomer,restaurantValidator.promoCodeList, function(req, res) {
    orderService.promoCodeList(req, function(result) {
        res.status(200).send(result);
    });
});

/** All promo List */
customerApi.post('/applyPromoCode',jwtTokenValidator.validateToken,restaurantValidator.applyPromoCode, function(req, res) {
    orderService.applyPromoCode(req, function(result) {
        res.status(200).send(result);
    });
});

/** Forgot Email */
customerApi.post('/forgotEmail', customerValidator.forgotEmail, function(req, res) {
    registerService.forgotEmail(req.body, function(result) {
        res.status(200).send(result);
    })
});

/** Verify Mobile OTP */
customerApi.post('/verifyMobileOTP', customerValidator.verifyMobileOTP, function(req, res) {
    registerService.verifyMobileOTP(req.body, function(result) {
        res.status(200).send(result);
    })
});


/** Favourite/unfavorite */
customerApi.post('/favouriteChange',jwtTokenValidator.validateToken,restaurantValidator.favouriteChange, function(req, res) {
    restaurantService.favouriteChange(req, function(result) {
        res.status(200).send(result);
    });
});

/** Favourite/unfavorite */
customerApi.post('/favouriteList',jwtTokenValidator.validateToken,restaurantValidator.favouriteList, function(req, res) {
    restaurantService.favouriteList(req, function(result) {
        res.status(200).send(result);
    });
});

/** physicalAddressByLatlong  */
customerApi.post('/protectGuestUser',restaurantValidator.protectGuestUser, function(req, res) {
    restaurantService.protectGuestUser(req, function(result) {
        res.status(200).send(result);
    });
});

/** physicalAddressByLatlong  */
customerApi.post('/physicalAddressByLatlong',jwtTokenValidator.validateToken,restaurantValidator.physicalAddressByLatlong, function(req, res) {
    restaurantService.physicalAddressByLatlong(req, function(result) {
        res.status(200).send(result);
    });
});

/** Get notification */
customerApi.post('/getNotificationData',jwtTokenValidator.validateToken, restaurantValidator.getNotificationData, function(req, res) {
    restaurantService.getNotificationData(req, function(result) {
        res.status(200).send(result);
    })
});

/** Update notification */
customerApi.post('/updateNotificationData',jwtTokenValidator.validateToken, restaurantValidator.updateNotificationData, function(req, res) {
    restaurantService.updateNotificationData(req, function(result) {
        res.status(200).send(result);
    })
});

/** Notification list */
customerApi.post('/notificationList',jwtTokenValidator.validateToken, restaurantValidator.notificationList, function(req, res) {
    restaurantService.notificationList(req, function(result) {
        res.status(200).send(result);
    })
});

/** Notification list */
customerApi.post('/notificationDelete',jwtTokenValidator.validateToken, restaurantValidator.notificationDelete, function(req, res) {
    restaurantService.notificationDelete(req, function(result) {
        res.status(200).send(result);
    })
});

/** Notification list */
customerApi.post('/updateBadgeCount', jwtTokenValidator.validateToken, restaurantValidator.notificationDelete, function (req, res) {
    restaurantService.updateBadgeCount(req, function (result) {
        res.status(200).send(result);
    })
});

/** Payment initialize  */
customerApi.post('/paymentInitialize',jwtTokenValidator.validateToken,paymentValidator.paymentInitialize, function(req, res) {
    paymentService.paymentInitialize(req, function(result) {
        res.status(200).send(result);
    });
});

/** Payment initialize  */
customerApi.post('/paymentVerify',jwtTokenValidator.validateToken,paymentValidator.paymentVerify, function(req, res) {
    paymentService.paymentVerify(req, function(result) {
        res.status(200).send(result);
    });
});

/** Payment all cards  */
customerApi.post('/paymentCards',jwtTokenValidator.validateToken,paymentValidator.paymentCards, function(req, res) {
    paymentService.paymentCards(req, function(result) {
        res.status(200).send(result);
    });
});

/** Payment second time  */
customerApi.post('/paymentRecurring',jwtTokenValidator.validateToken,paymentValidator.paymentRecurring, function(req, res) {
    paymentService.paymentRecurring(req, function(result) {
        res.status(200).send(result);
    });
});

/** Get ussd bank  */
customerApi.post('/getPaymentBank',jwtTokenValidator.validateToken,paymentValidator.getUssdBank, function(req, res) {
    paymentService.getPaymentBank(req, function(result) {
        res.status(200).send(result);
    });
});

/** Payment bank transfer  */
customerApi.post('/paymentBank',jwtTokenValidator.validateToken,paymentValidator.paymentBank, function(req, res) {
    paymentService.paymentBank(req, function(result) {
        res.status(200).send(result);
    });
});

/** Payment Submit Otp  */
customerApi.post('/paymentOtp',jwtTokenValidator.validateToken,paymentValidator.paymentOtp, function(req, res) {
    paymentService.paymentOtp(req, function(result) {
        res.status(200).send(result);
    });
});

/** Payment Submit Pin  */
customerApi.post('/paymentPin',jwtTokenValidator.validateToken,paymentValidator.paymentPin, function(req, res) {
    paymentService.paymentPin(req, function(result) {
        res.status(200).send(result);
    });
});

/** Payment Submit Pin  */
customerApi.post('/paymentPhone',jwtTokenValidator.validateToken,paymentValidator.paymentPhone, function(req, res) {
    paymentService.paymentPhone(req, function(result) {
        res.status(200).send(result);
    });
});

/** Get ussd bank  */
customerApi.post('/getUssdBank',jwtTokenValidator.validateToken,paymentValidator.getUssdBank, function(req, res) {
    paymentService.getUssdBank(req, function(result) {
        res.status(200).send(result);
    });
});

/** Payment ussd  */
customerApi.post('/paymentUssd',jwtTokenValidator.validateToken,paymentValidator.paymentUssd, function(req, res) {
    paymentService.paymentUssd(req, function(result) {
        res.status(200).send(result);
    });
});

/** Receive from webhook  */
customerApi.post('/getPaymentResponse', function(req, res) {
    paymentService.getPaymentResponse(req, function(result) {
        res.status(200).send(result);
    });
});

/** Gokada check fare  */
customerApi.post('/checkFare',jwtTokenValidator.validateToken,deliveryValidator.checkFare, function(req, res) {
    deliveryService.checkFare(req, function(result) {
        res.status(200).send(result);
    });
});

/** Gokada order Status  */
customerApi.post('/orderTrack',jwtTokenValidator.validateToken,deliveryValidator.orderTrack, function(req, res) {
    deliveryService.orderTrack(req, function(result) {
        res.status(200).send(result);
    });
});

/** Gokada order Status  */
customerApi.post('/orderCreate',jwtTokenValidator.validateToken,deliveryValidator.orderTrack, function(req, res) {
    deliveryService.orderCreate(req, function(result) {
        res.status(200).send(result);
    });
});

/** get account info  */
customerApi.post('/getCustomerContent', jwtTokenValidator.validateToken, restaurantValidator.getCustomerContent, function (req, res) {
    restaurantService.getCustomerContent(req, function (result) {
        res.status(200).send(result);
    });
});


module.exports = customerApi;