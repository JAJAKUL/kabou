var async = require('async');
const registerModel = require('../../models/deliveryboy/register-model');

module.exports = {
    customerRegister: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                registerModel.customerRegistration(data, function (result) {
                    nextCb(null, result);
                })
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },

    customerLogin: (data, callBack) => {


        async.waterfall([
            function (nextCb) {
                registerModel.customerLogin(data, function (result) {
                    nextCb(null, result);
                })
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });

    },
    customerVerifyUser: (data, callBack) => {

        async.waterfall([
            function (nextCb) {
                registerModel.customerVerifyUser(data, function (result) {
                    nextCb(null, result);
                })
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });


    },

    forgotEmail: (data, callBack) => {


        async.waterfall([
            function (nextCb) {
                registerModel.forgotEmail(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });


    },
    forgotPassword: (data, callBack) => {

        async.waterfall([
            function (nextCb) {
                registerModel.customerForgotPassword(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });



    },

    resetPassword: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                registerModel.customerResetPassword(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });

    },

    resendForgotPassordOtp: (data, callBack) => {
        if (data.resendType == 'login') {
            async.waterfall([
                function (nextCb) {
                    registerModel.customerResendOtp(data, function (result) {
                        nextCb(null, result);
                    });
                }
            ], function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 403,
                        message: 'Request Forbidden',
                        response_data: {}
                    })
                } else {
                    callBack(result);
                }
            });
        } else {
            async.waterfall([
                function (nextCb) {
                    registerModel.customerResendForgotPasswordOtp(data, function (result) {
                        nextCb(null, result);
                    });
                }
            ], function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 403,
                        message: 'Request Forbidden',
                        response_data: {}
                    })
                } else {
                    callBack(result);
                }
            });
        }
    },

    viewProfile: (data, callBack) => {

        async.waterfall([
            function (nextCb) {
                registerModel.customerViewProfile(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    editProfile: (data, callBack) => {
            async.waterfall([
                function (nextCb) {
                    registerModel.customerEditProfile(data, function (result) {
                        nextCb(null, result);
                    });
                }
            ], function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 403,
                        message: 'Request Forbidden',
                        response_data: {}
                    })
                } else {
                    callBack(result);
                }
            });
        

    },
    changePassword: (data, callBack) => {

        async.waterfall([
            function (nextCb) {
                registerModel.customerChangePassword(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });

    },
    logout: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                registerModel.logout(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    devicePush: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                registerModel.devicePush(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    numberPlateImageUpload: (data, callBack) => {

            async.waterfall([
                function (nextCb) {
                    registerModel.numberPlateImageUpload(data, function (result) {
                        nextCb(null, result);
                    });
                }
            ], function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 403,
                        message: 'Request Forbidden',
                        response_data: {}
                    })
                } else {
                    callBack(result);
                }
            });
        
    },
    licenceImageUpload: (data, callBack) => {

            async.waterfall([
                function (nextCb) {
                    registerModel.licenceImageUpload(data, function (result) {
                        nextCb(null, result);
                    });
                }
            ], function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 403,
                        message: 'Request Forbidden',
                        response_data: {}
                    })
                } else {
                    callBack(result);
                }
            });
        
    },
    profileImageUpload: (data, callBack) => {

        async.waterfall([
            function (nextCb) {
                registerModel.profileImageUpload(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    
},
    verifyUser: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                registerModel.verifyUser(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    updateUserEmail: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                registerModel.updateUserEmail(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    updateUserPhone: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                registerModel.updateUserPhone(data, function (result) {
                    nextCb(null, result);
                });
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
}