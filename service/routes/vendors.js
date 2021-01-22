'use strict';
var express = require('express');
const restaurantService = require('../services/vendor/restaurant-service');
const paymentService = require('../services/payment-service');

const orderValidator = require('../middlewares/validators/vendor/order-validator');
const jwtTokenValidator = require('../middlewares/jwt-validation-middlewares');
const vendorValidator = require('../middlewares/validators/vendor/vendor-validator');

const paymentValidator = require('../middlewares/validators/vendor/payment-validator');

var vendorApi = express.Router();
vendorApi.use(express.json());
vendorApi.use(express.urlencoded({ extended: false }));

/** All Order Statuis */
vendorApi.post('/orderStatus', jwtTokenValidator.validateToken, function (req, res) {
    restaurantService.orderStatus(req.body, function (result) {
        res.status(200).send(result);
    });
})

/** Order Listing */
vendorApi.post('/orderList', jwtTokenValidator.validateToken, orderValidator.orderListValidator, function (req, res) {
    restaurantService.orderList(req.body, function (result) {
        res.status(200).send(result);
    });
})

/** Order List */
vendorApi.post('/dashboard', jwtTokenValidator.validateToken, orderValidator.dashboardValidatior, function (req, res) {
    restaurantService.dashboard(req, function (result) {
        res.status(200).send(result);
    });
})

/** Order Confirmation */
vendorApi.post('/orderConfirm', orderValidator.orderConfirmValidator, function (req, res) {
    restaurantService.orderConfirm(req.body, function (result) {
        res.status(200).send(result);
    });
})

/** Vendor registration */
//,
vendorApi.post('/registerVendor', vendorValidator.addVendorValidator, function (req, res) {
    restaurantService.addVendor(req, function (result) {
        res.status(200).send(result);
    })
});

vendorApi.post('/vendorTypes', function (req, res) {
    restaurantService.vendorTypes(req, function (result) {
        res.status(200).send(result);
    })
});
 
/** Vendor time registration */
vendorApi.post('/registerVendorTime', vendorValidator.addVendorTimeValidator, function (req, res) {
    restaurantService.addVendorTime(req, function (result) {
        res.status(200).send(result);
    })
});

/** Customer Verify OTP */
vendorApi.post('/vendorVerifyUser', vendorValidator.vendorVerifyUser, function (req, res) {
    restaurantService.vendorVerifyUser(req, function (result) {
        res.status(200).send(result);
    })
});

vendorApi.post('/getAllCategories', jwtTokenValidator.validateToken, vendorValidator.getCategoryValidator, function (req, res) {
    restaurantService.getAllCategories(req, function (result) {
        res.status(200).send(result);
    })
});

/** Item Add */
vendorApi.post('/addItem', jwtTokenValidator.validateToken, vendorValidator.itemAddValidator, function (req, res) {
    restaurantService.addItem(req, function (result) {
        res.status(200).send(result);
    })
});

/** Item Get */
vendorApi.post('/getItem', jwtTokenValidator.validateToken, vendorValidator.getItem, function (req, res) {
    restaurantService.getItem(req, function (result) {
        res.status(200).send(result);
    })
});

/** Item update */
vendorApi.post('/updateItem', jwtTokenValidator.validateToken, vendorValidator.updateItem, function (req, res) {
    restaurantService.updateItem(req, function (result) {
        res.status(200).send(result);
    })
});

/** Get Item Options  */
vendorApi.post('/getItemOptions', jwtTokenValidator.validateToken, vendorValidator.getItemOptions, function (req, res) {
    restaurantService.getItemOptions(req, function (result) {
        res.status(200).send(result);
    })
});

/** Get Item Extra name  */
vendorApi.post('/getItemExtraName', jwtTokenValidator.validateToken, vendorValidator.getItemOptions, function (req, res) {
    restaurantService.getItemExtraName(req, function (result) {
        res.status(200).send(result);
    })
});


/** Item update */
vendorApi.post('/updateItemStatus', jwtTokenValidator.validateToken, vendorValidator.updateItemStatus, function (req, res) {
    restaurantService.updateItemStatus(req, function (result) {
        res.status(200).send(result);
    })
});

/** Item List */
vendorApi.post('/itemList', jwtTokenValidator.validateToken, vendorValidator.itemList, function (req, res) {
    restaurantService.itemList(req, function (result) {
        res.status(200).send(result);
    })
});

/** Item delete */
vendorApi.post('/deleteItem', jwtTokenValidator.validateToken, vendorValidator.deleteItem, function (req, res) {
    restaurantService.deleteItem(req, function (result) {
        res.status(200).send(result);
    })
});

/** Get Vendor Reviews */
vendorApi.post('/getVendorReviews', jwtTokenValidator.validateToken, vendorValidator.getVendorDetails, function (req, res) {
    restaurantService.getVendorReviews(req, function (result) {
        res.status(200).send(result);
    })
});

/** Get Vendor Reviews */
vendorApi.post('/updateVendorReviews', jwtTokenValidator.validateToken, vendorValidator.updateVendorReviews, function (req, res) {
    restaurantService.updateVendorReviews(req, function (result) {
        res.status(200).send(result);
    })
});

/** Get Vendor Details */
vendorApi.post('/getVendorDetails', jwtTokenValidator.validateToken, vendorValidator.getVendorDetails, function (req, res) {
    restaurantService.getVendorDetails(req, function (result) {
        res.status(200).send(result);
    })
});

/** Update Vendor Details */
vendorApi.post('/updateVendorDetails', jwtTokenValidator.validateToken, vendorValidator.updateVendorDetails, function (req, res) {
    restaurantService.updateVendorDetails(req, function (result) {
        res.status(200).send(result);
    })
});

/** Update Vandor Location */
vendorApi.post('/updateVendorLocation', jwtTokenValidator.validateToken, vendorValidator.updateVendorLocation, function (req, res) {
    restaurantService.updateVendorLocation(req, function (result) {
        res.status(200).send(result);
    })
});

/** Update Banner */
vendorApi.post('/updateVendorTime', jwtTokenValidator.validateToken, vendorValidator.updateVendorTime, function (req, res) {
    restaurantService.updateVendorTime(req, function (result) {
        res.status(200).send(result);
    })
});

/** Verify Infor Before Changing Email/Phone */
vendorApi.post('/verifyUser', jwtTokenValidator.validateToken, vendorValidator.verifyUser, function (req, res) {
    restaurantService.verifyUser(req, function (result) {
        res.status(200).send(result);
    })
});

/** Update Vendor Email */
vendorApi.post('/updateVendorEmail', jwtTokenValidator.validateToken, vendorValidator.updateVendorEmail, function (req, res) {
    restaurantService.updateVendorEmail(req, function (result) {
        res.status(200).send(result);
    })
});

/** Update Vendor Phone */
vendorApi.post('/updateVendorPhone', jwtTokenValidator.validateToken, vendorValidator.updateVendorPhone, function (req, res) {
    restaurantService.updateVendorPhone(req, function (result) {
        res.status(200).send(result);
    })
});

/** Banner upload */
vendorApi.post('/bannerUpload', jwtTokenValidator.validateToken, vendorValidator.bannerUpload, function (req, res) {
    restaurantService.bannerUpload(req, function (result) {
        res.status(200).send(result);
    });
})


/** logo upload */
vendorApi.post('/logoUpload', jwtTokenValidator.validateToken, vendorValidator.bannerUpload, function (req, res) {
    restaurantService.logoUpload(req, function (result) {
        res.status(200).send(result);
    });
})


/** Licence upload */
vendorApi.post('/licenceUpload', jwtTokenValidator.validateToken, vendorValidator.bannerUpload, function (req, res) {
    restaurantService.licenceUpload(req, function (result) {
        res.status(200).send(result);
    });
})

/** Food safety upload */
vendorApi.post('/foodSafetyUpload', jwtTokenValidator.validateToken, vendorValidator.bannerUpload, function (req, res) {
    restaurantService.foodSafetyUpload(req, function (result) {
        res.status(200).send(result);
    });
})

/** Get notification */
vendorApi.post('/getNotificationData', jwtTokenValidator.validateToken, vendorValidator.getNotificationData, function (req, res) {
    restaurantService.getNotificationData(req, function (result) {
        res.status(200).send(result);
    })
});

/** Update notification */
vendorApi.post('/updateNotificationData', jwtTokenValidator.validateToken, vendorValidator.updateNotificationData, function (req, res) {
    restaurantService.updateNotificationData(req, function (result) {
        res.status(200).send(result);
    })
});

/** Notification list */
vendorApi.post('/notificationList', jwtTokenValidator.validateToken, vendorValidator.notificationList, function (req, res) {
    restaurantService.notificationList(req, function (result) {
        res.status(200).send(result);
    })
});

/** Notification list */
vendorApi.post('/notificationDelete', jwtTokenValidator.validateToken, vendorValidator.notificationDelete, function (req, res) {
    restaurantService.notificationDelete(req, function (result) {
        res.status(200).send(result);
    })
});

/** Notification list */
vendorApi.post('/updateBadgeCount', jwtTokenValidator.validateToken, vendorValidator.notificationDelete, function (req, res) {
    restaurantService.updateBadgeCount(req, function (result) {
        res.status(200).send(result);
    })
});

/** Sub account create/update  */
vendorApi.post('/subaccountCreate', function(req, res) {
    paymentService.subaccountCreate(req, function(result) {
        res.status(200).send(result);
    });
});


/** get account info  */
vendorApi.post('/getSubAccount', jwtTokenValidator.validateToken, paymentValidator.getSubAccount, function (req, res) {
    paymentService.getSubAccount(req, function (result) {
        res.status(200).send(result);
    });
});


/** get account info  */
vendorApi.post('/getVendorContent', jwtTokenValidator.validateToken, vendorValidator.getVendorContent, function (req, res) {
    restaurantService.getVendorContent(req, function (result) {
        res.status(200).send(result);
    });
});





module.exports = vendorApi;