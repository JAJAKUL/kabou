
var jwt = require('jsonwebtoken');
var deliveryBoySchema = require('../../schema/DeliveryBoy');
var userDeviceLoginSchema = require('../../schema/UserDeviceLogin');
const config = require('../../config');
const mail = require('../../modules/sendEmail');
var bcrypt = require('bcryptjs');

module.exports = {
    //Customer 
    customerRegistration: (req, callBack) => {
        if (req) {
            var data = req.body;
            /** Check for delivery boy existence */
            deliveryBoySchema.countDocuments({ email: data.email }).exec(function (err, count) {
                if (err) {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (count) {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'User already exists for this email',
                            response_data: {}
                        });
                    } else {
                        deliveryBoySchema.countDocuments({ phone: data.phone }).exec(async function (err, count) {
                            if (err) {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });

                            } if (count) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 422,
                                    message: 'User already exists for this phone no.',
                                    response_data: {}
                                });
                            } else {

                                var customerdata = data;
                                customerdata.status = 'INACTIVE'

                                var files = req.files;

                                if (files == null) {
                                    var licenceImageInfo = '';
                                    var numberPlateImageInfo = ''

                                } else {
                                    if ((files.licenceImage != undefined) && (files.licenceImage != '')) {
                                        //Image Upload
                                        var licenceImageInfo = await uploaddeliveryBoyImage(files.licenceImage, 'licenceImage');
                                    } else {
                                        var licenceImageInfo = ''
                                    }


                                    if ((files.numberPlateImage != undefined) && (files.numberPlateImage != '')) {
                                        var numberPlateImageInfo = await uploaddeliveryBoyImage(files.numberPlateImage, 'numberPlateImage');
                                    } else {
                                        var numberPlateImageInfo = ''
                                    }
                                }

                                customerdata.numberPlateImage = numberPlateImageInfo
                                customerdata.licenceImage = licenceImageInfo



                                new deliveryBoySchema(customerdata).save(async function (err, result) {
                                    if (err) {
                                        console.log(err);
                                        callBack({
                                            success: false,
                                            STATUSCODE: 500,
                                            message: 'Internal DB error',
                                            response_data: {}
                                        });
                                    } else {



                                        var userOtp = await sendVerificationCode(result);

                                        var resUser = {
                                            userId: result._id
                                        }

                                        callBack({
                                            success: false,
                                            STATUSCODE: 200,
                                            message: 'Please check your email. We have sent a code to be used to verify your account.',
                                            response_data: resUser
                                        });






                                    }
                                })

                            }
                        });
                    }
                }
            })
        }
    },
    customerLogin: (data, callBack) => {
        if (data) {

            var loginUser = '';
            var loginErrMsg = '';



            if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(data.user)) {
                var loginCond = { email: data.user };
                loginUser = 'EMAIL';
                loginErrMsg = 'Invalid email or password'
            }
            else {
                var loginCond = { phone: data.user };
                loginUser = 'PHONE';
                loginErrMsg = 'Invalid phone or password'
            }


            deliveryBoySchema.findOne(loginCond, async function (err, result) {

                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {
                        if (result.status == 'ACTIVE') {

                            //ADD DATA IN USER LOGIN DEVICE TABLE
                            var userDeviceData = {
                                userId: result._id,
                                userType: 'DELIVERY_BOY',
                                appType: data.appType,
                                pushMode: data.pushMode,
                                deviceToken: data.deviceToken
                            }
                            new userDeviceLoginSchema(userDeviceData).save(async function (err, success) {
                                if (err) {
                                    console.log(err);
                                    callBack({
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error',
                                        response_data: {}
                                    });
                                } else {
                                    var loginId = success._id;

                                    //  console.log('hello');
                                    if ((data.password == '') || (data.password == undefined)) {
                                        callBack({
                                            success: false,
                                            STATUSCODE: 422,
                                            message: 'Password is required',
                                            response_data: {}
                                        });
                                    } else {
                                        const comparePass = bcrypt.compareSync(data.password, result.password);
                                        if (comparePass) {
                                            const authToken = generateToken(result);
                                            let response = {
                                                userDetails: {
                                                    fullName: result.fullName,
                                                    email: result.email,
                                                    countryCode: result.countryCode,
                                                    phone: result.phone.toString(),
                                                    id: result._id,
                                                    loginId: loginId,
                                                    profileImage: `${config.serverhost}:${config.port}/img/profile-pic/` + result.profileImage
                                                },
                                                authToken: authToken
                                            }

                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'Login successfully',
                                                response_data: response
                                            })

                                        } else {
                                            callBack({
                                                success: false,
                                                STATUSCODE: 422,
                                                message: loginErrMsg,
                                                response_data: {}
                                            });
                                        }
                                    }

                                }
                            })

                        } else {

                            var resUser = {
                                userId: result._id
                            }

                            callBack({
                                success: false,
                                STATUSCODE: 410,
                                message: 'Please check your email. We have sent a code to be used to verify your account.',
                                response_data: resUser
                            });
                        }

                    } else {

                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: loginErrMsg,
                            response_data: {}
                        });


                    }
                }
            })
        }
    },
    customerVerifyUser: (req, callBack) => {
        if (req) {
            var data = req.body;

            var userId = data.userId;
            var verifyOtp = data.verificationCode;

            deliveryBoySchema.findOne({ _id: userId })
                .then(async (customer) => {
                    if (customer != null) {

                        var otpCheck = await deliveryBoySchema.findOne({ _id: userId, verifyOtp: verifyOtp });

                        if (otpCheck != null) {
                            var userResp = await deliveryBoySchema.updateOne({ _id: userId }, { $set: { status: 'ACTIVE' } });

                            mail('userRegistrationMail')(customer.email, {}).send();

                            //ADD DATA IN USER LOGIN DEVICE TABLE
                            var userDeviceData = {
                                userId: userId,
                                userType: 'DELIVERY_BOY',
                                appType: data.appType,
                                pushMode: data.pushMode,
                                deviceToken: data.deviceToken
                            }
                            new userDeviceLoginSchema(userDeviceData).save(async function (err, success) {
                                if (err) {
                                    console.log(err);
                                    callBack({
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error',
                                        response_data: {}
                                    });
                                } else {
                                    var loginId = success._id;
                                    const authToken = generateToken(customer);

                                    let response = {
                                        userDetails: {
                                            fullName: customer.fullName,
                                            email: customer.email,
                                            countryCode: customer.countryCode,
                                            phone: customer.phone.toString(),
                                            id: customer._id,
                                            loginId: loginId,
                                            profileImage: `${config.serverhost}:${config.port}/img/profile-pic/` + customer.profileImage
                                        },
                                        authToken: authToken
                                    }



                                    callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: 'User verified successfully.',
                                        response_data: response
                                    })
                                }
                            });
                        } else {
                            callBack({
                                success: false,
                                STATUSCODE: 422,
                                message: 'Invalid verification code.',
                                response_data: {}
                            })
                        }

                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'User not found.',
                            response_data: {}
                        });
                    }

                });






        }
    },
    customerForgotPassword: (data, callBack) => {
        if (data) {
            deliveryBoySchema.findOne({ email: data.email }, function (err, customer) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (customer) {
                        let forgotPasswordOtp = Math.random().toString().replace('0.', '').substr(0, 6);
                        customer = customer.toObject();
                        customer.forgotPasswordOtp = forgotPasswordOtp;
                        try {
                            mail('forgotPasswordMail')(customer.email, customer).send();
                            console.log('done');
                            callBack({
                                success: false,
                                STATUSCODE: 200,
                                message: 'Please check your email. We have sent a code to be used to reset password.',
                                response_data: {
                                    email: customer.email,
                                    forgotPassOtp: forgotPasswordOtp
                                }
                            });
                        } catch (Error) {
                            console.log('Something went wrong while sending email');
                        }
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'User not found',
                            response_data: {}
                        });
                    }
                }
            })
        }
    },
    customerResetPassword: (data, callBack) => {
        if (data) {
            deliveryBoySchema.findOne({ email: data.email }, function (err, customer) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (customer) {
                        bcrypt.hash(data.password, 8, function (err, hash) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong while setting the password',
                                    response_data: {}
                                });
                            } else {
                                deliveryBoySchema.updateOne({ _id: customer._id }, {
                                    $set: {
                                        password: hash
                                    }
                                }, function (err, res) {
                                    if (err) {
                                        callBack({
                                            success: false,
                                            STATUSCODE: 500,
                                            message: 'Internal DB error',
                                            response_data: {}
                                        });
                                    } else {
                                        //ADD DATA IN USER LOGIN DEVICE TABLE
                                        var userDeviceData = {
                                            userId: customer._id,
                                            userType: 'DELIVERY_BOY',
                                            appType: data.appType,
                                            pushMode: data.pushMode,
                                            deviceToken: data.deviceToken
                                        }
                                        new userDeviceLoginSchema(userDeviceData).save(async function (err, success) {
                                            if (err) {
                                                console.log(err);
                                                callBack(null, {
                                                    success: false,
                                                    STATUSCODE: 500,
                                                    message: 'Internal DB error',
                                                    response_data: {}
                                                });
                                            } else {
                                                var loginId = success._id;
                                                console.log(customer);
                                                const authToken = generateToken(customer);
                                                let response = {
                                                    userDetails: {
                                                        fullName: customer.fullName,
                                                        email: customer.email,
                                                        countryCode: customer.countryCode,
                                                        phone: customer.phone.toString(),
                                                        id: customer._id,
                                                        loginId: loginId,
                                                        profileImage: `${config.serverhost}:${config.port}/img/profile-pic/` + customer.profileImage
                                                    },
                                                    authToken: authToken
                                                }
                                                callBack({
                                                    success: true,
                                                    STATUSCODE: 200,
                                                    message: 'Password updated successfully',
                                                    response_data: response
                                                });
                                            }
                                        })

                                    }
                                })
                            }
                        })
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'User not found',
                            response_data: {}
                        });
                    }
                }
            })
        }
    },
    customerResendOtp: (data, callBack) => {
        if (data) {
            deliveryBoySchema.findOne({ email: data.email }, async function (err, customer) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (customer) {

                        var userOtp = await sendVerificationCode(customer);

                        var resUser = {
                            userId: customer._id,
                            email: customer.email
                        }

                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'Please check your email. We have sent a code to be used to verify your account.',
                            response_data: resUser
                        });
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'User not found',
                            response_data: {}
                        });
                    }
                }
            })
        }
    },
    customerResendForgotPasswordOtp: (data, callBack) => {
        if (data) {
            console.log(data);
            deliveryBoySchema.findOne({ email: data.email }, function (err, customer) {
                if (err) {
                    console.log('err', err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (customer) {
                        let forgotPasswordOtp = Math.random().toString().replace('0.', '').substr(0, 6);
                        customer = customer.toObject();
                        customer.forgotPasswordOtp = forgotPasswordOtp;
                        try {
                            mail('forgotPasswordMail')(customer.email, customer).send();
                            callBack({
                                success: false,
                                STATUSCODE: 200,
                                message: 'Please check your email. We have sent a code to be used to reset password.',
                                response_data: {
                                    email: customer.email,
                                    forgotPassOtp: forgotPasswordOtp
                                }
                            });
                        } catch (Error) {
                            console.log('Something went wrong while sending email');

                            callBack({
                                success: false,
                                STATUSCODE: 422,
                                message: 'Something went wrong while sending email',
                                response_data: {}
                            });
                        }
                    } else {
                        console.log('User not found');
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'User not found',
                            response_data: {}
                        });
                    }
                }
            })
        }
    },
    //AFTER LOGIN
    customerViewProfile: (data, callBack) => {
        if (data) {

            deliveryBoySchema.findOne({ _id: data.customerId }, function (err, customer) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (customer) {
                        let response = {
                            fullName: customer.fullName,
                            vehicleType: customer.vehicleType,
                            email: customer.email,
                            phone: customer.phone.toString(),
                            countryCode: customer.countryCode,
                            profileImage: `${config.serverhost}:${config.port}/img/profile-pic/` + customer.profileImage
                        }

                        if (customer.numberPlateImage != '') {
                            response.numberPlateImage = `${config.serverhost}:${config.port}/img/deliveryboy/` + customer.numberPlateImage
                        } else {
                            response.numberPlateImage = ''
                        }

                        if (customer.licenceImage != '') {
                            response.licenceImage = `${config.serverhost}:${config.port}/img/deliveryboy/` + customer.licenceImage
                        } else {
                            response.licenceImage = ''
                        }
                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'User profile fetched successfully',
                            response_data: response
                        })

                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'User not found',
                            response_data: {}
                        });
                    }
                }
            });

        }
    },
    customerEditProfile: (data, callBack) => {
        if (data) {

            let updateData = {
                fullName: data.fullName,
                vehicleType: data.vehicleType,
            }

            updateUser(updateData, { _id: data.customerId });
            callBack({
                success: true,
                STATUSCODE: 200,
                message: 'User updated successfully',
                response_data: {}
            })

        }
    },
    customerChangePassword: (data, callBack) => {
        if (data) {

            deliveryBoySchema.findOne({ _id: data.customerId }, function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {
                        const comparePass = bcrypt.compareSync(data.oldPassword, result.password);
                        if (comparePass) {

                            bcrypt.hash(data.newPassword, 8, function (err, hash) {
                                if (err) {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Something went wrong while setting the password',
                                        response_data: {}
                                    });
                                } else {
                                    deliveryBoySchema.update({ _id: data.customerId }, {
                                        $set: {
                                            password: hash
                                        }
                                    }, function (err, res) {
                                        if (err) {
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });
                                        } else {
                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'Password updated successfully',
                                                response_data: {}
                                            });
                                        }
                                    })
                                }
                            })
                        } else {
                            callBack({
                                success: false,
                                STATUSCODE: 422,
                                message: 'Invalid old password',
                                response_data: {}
                            });
                        }
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'User not found',
                            response_data: {}
                        });
                    }
                }
            });




        }
    },
    numberPlateImageUpload: (data, callBack) => {
        if (data) {

            deliveryBoySchema.findOne({ _id: data.body.customerId }, function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {
                        if (result.numberPlateImage != '') {
                            var fs = require('fs');
                            var filePath = `public/img/deliveryboy/${result.numberPlateImage}`;
                            fs.unlink(filePath, (err) => { });
                        }

                        //Get image extension
                        var ext = getExtension(data.files.image.name);

                        // The name of the input field (i.e. "image") is used to retrieve the uploaded file
                        let sampleFile = data.files.image;

                        var file_name = `numberPlateImage-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

                        // Use the mv() method to place the file somewhere on your server
                        sampleFile.mv(`public/img/deliveryboy/${file_name}`, function (err) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal error',
                                    response_data: {}
                                });
                            } else {
                                updateUser({ numberPlateImage: file_name }, { _id: data.body.customerId });
                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Number plate image updated successfully',
                                    response_data: {}
                                })
                            }
                        });
                    }
                }
            });


        }
    },
    licenceImageUpload: (data, callBack) => {
        if (data) {

            deliveryBoySchema.findOne({ _id: data.body.customerId }, function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {
                        if (result.licenceImage != '') {
                            var fs = require('fs');
                            var filePath = `public/img/deliveryboy/${result.licenceImage}`;
                            fs.unlink(filePath, (err) => { });
                        }

                        //Get image extension
                        var ext = getExtension(data.files.image.name);

                        // The name of the input field (i.e. "image") is used to retrieve the uploaded file
                        let sampleFile = data.files.image;

                        var file_name = `licenceImage-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

                        // Use the mv() method to place the file somewhere on your server
                        sampleFile.mv(`public/img/deliveryboy/${file_name}`, function (err) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal error',
                                    response_data: {}
                                });
                            } else {
                                updateUser({ licenceImage: file_name }, { _id: data.body.customerId });
                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Licence image updated Successfully',
                                    response_data: {}
                                })
                            }
                        });
                    }
                }
            });


        }
    },
    profileImageUpload: (data, callBack) => {
        if (data) {

            deliveryBoySchema.findOne({ _id: data.body.customerId }, function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {
                        if (result.profileImage != '') {
                            var fs = require('fs');
                            var filePath = `public/img/profile-pic/${result.profileImage}`;
                            fs.unlink(filePath, (err) => { });
                        }

                        //Get image extension
                        var ext = getExtension(data.files.image.name);

                        // The name of the input field (i.e. "image") is used to retrieve the uploaded file
                        let sampleFile = data.files.image;

                        var file_name = `profileImage-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

                        // Use the mv() method to place the file somewhere on your server
                        sampleFile.mv(`public/img/profile-pic/${file_name}`, function (err) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal error',
                                    response_data: {}
                                });
                            } else {
                                updateUser({ profileImage: file_name }, { _id: data.body.customerId });
                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Profile image updated Successfully',
                                    response_data: {}
                                })
                            }
                        });
                    }
                }
            });


        }
    },
    logout: (data, callBack) => {
        if (data) {
            var loginId = data.loginId;
            userDeviceLoginSchema.deleteOne({ _id: loginId }, function (err) {
                if (err) {
                    console.log(err);
                }
                // deleted at most one tank document
            });
            callBack({
                success: true,
                STATUSCODE: 200,
                message: 'User logged out Successfully',
                response_data: {}
            })
        }
    },
    devicePush: (data, callBack) => {
        if (data) {
            // console.log(data);
            var loginId = data.loginId;

            //ADD DATA IN USER LOGIN DEVICE TABLE
            var userDeviceData = {
                appType: data.appType,
                pushMode: data.pushMode,
                deviceToken: data.deviceToken
            }

            userDeviceLoginSchema.updateOne({ _id: loginId }, {
                $set: userDeviceData
            }, function (err, res) {
                if (err) {
                    console.log(err)
                }
                callBack({
                    success: true,
                    STATUSCODE: 200,
                    message: 'User device info updated Successfully',
                    response_data: {}
                })
            });
        }
    },
    forgotEmail: (data, callBack) => {
        if (data) {

                deliveryBoySchema.findOne({ phone: data.phone}, function (err, customer) {
                    if (err) {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    } else {
                        if (customer) {
                            let forgotPasswordOtp = Math.random().toString().replace('0.', '').substr(0, 6);
                            customer = customer.toObject();
                            customer.forgotPasswordOtp = forgotPasswordOtp;
                            try {
                                mail('forgotEmailMail')(customer.email, customer).send();
                                callBack({
                                    success: false,
                                    STATUSCODE: 200,
                                    message: 'Please check your phone. We have sent a code to be used to reset your email.',
                                    response_data: {
                                        email: customer.email,
                                        forgotPassOtp: forgotPasswordOtp
                                    }
                                });
                            } catch (Error) {
                                console.log('Something went wrong while sending email');
                            }
                        } else {
                            callBack({
                                success: false,
                                STATUSCODE: 422,
                                message: 'User not found',
                                response_data: {}
                            });
                        }
                    }
                })
           

        }
    },
    //verify User Before Changing Email/Phone
    verifyUser: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;


            deliveryBoySchema
                .findOne({ _id: reqBody.customerId })
                .then((customerres) => {
                    if (customerres != null) {


                        let forgotPasswordOtp = Math.random().toString().replace('0.', '').substr(0, 6);
                        customer = {};
                        customer.forgotPasswordOtp = forgotPasswordOtp;
                        try {
                            mail('verifyUserlMail')(customerres.email, customer).send();
                            callBack({
                                success: false,
                                STATUSCODE: 200,
                                message: 'Please check your email.',
                                response_data: {
                                    email: customer.email,
                                    otp: forgotPasswordOtp
                                }
                            });
                        } catch (Error) {
                            console.log('Something went wrong while sending email');
                        }

                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'User not found.',
                            response_data: {}
                        });
                    }
                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 400,
                        message: 'Something went wrong.',
                        response_data: {}
                    });
                });





        }
    },
    //Vendor Email Update
    updateUserEmail: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var updateUser = {
                email: reqBody.email,
            }

            deliveryBoySchema
                .findOne({ email: reqBody.email })
                .then((customerres) => {

                    if (customerres == null) {
                        deliveryBoySchema.update({ _id: reqBody.customerId }, {
                            $set: updateUser
                        }, function (err, res) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            } else {
                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Email updated successfully.',
                                    response_data: {}
                                });

                            }
                        });
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'Email already exists.',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 400,
                        message: 'Something went wrong.',
                        response_data: {}
                    });
                });





        }
    },
    //Vendor Phone Update
    updateUserPhone: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var updateUser = {
                countryCode: reqBody.countryCode,
                phone: reqBody.phone,
            }

            deliveryBoySchema
                .findOne({ phone: reqBody.phone })
                .then((customerRes) => {
                    if (customerRes == null) {
                        deliveryBoySchema.update({ _id: reqBody.customerId }, {
                            $set: updateUser
                        }, function (err, res) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            } else {
                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Phone updated successfully.',
                                    response_data: {}
                                });

                            }
                        });
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'Phone already exists.',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 400,
                        message: 'Something went wrong.',
                        response_data: {}
                    });
                });





        }
    },
}


function generateToken(userData) {
    let payload = { subject: userData._id, user: 'DELIVERY_BOY' };
    return jwt.sign(payload, config.secretKey, { expiresIn: '3600000h' })
}

function updateUser(update, cond) {
    return new Promise(function (resolve, reject) {
        deliveryBoySchema.update(cond, {
            $set: update
        }, function (err, res) {
            if (err) {
                return reject(err);
            } else {
                return resolve(res);
            }
        });
    });
}

function getExtension(filename) {
    return filename.substring(filename.indexOf('.') + 1);
}

function sendVerificationCode(customer) {
    return new Promise(async function (resolve, reject) {

        var lastData = await deliveryBoySchema.findOne({ _id: customer._id });

        var otpTime = lastData.otpTime;

        console.log('otpTime', otpTime);

        if ((otpTime == '') || (otpTime == undefined)) {
            var triggerNew = 1;
        } else {
            var date1 = new Date();
            // To calculate the time difference of two dates 
            var Difference_In_Time = Number(otpTime.getTime()) - Number(date1.getTime());

            var differenceTimeMinutes = Number(Difference_In_Time / 60000);

            if (differenceTimeMinutes > 15) {
                var triggerNew = 1;
            } else {
                var triggerNew = 0;
            }
        }

        console.log('triggerNew', triggerNew);

        if (triggerNew == 1) {

            let otp = Math.random().toString().replace('0.', '').substr(0, 6);
            customer = customer.toObject();
            customer.otp = otp;
            try {
                mail('sendOTPdMail')(customer.email, customer).send();

                await deliveryBoySchema.updateOne({ _id: customer._id }, {
                    $set: {
                        verifyOtp: otp,
                        otpTime: new Date()
                    }
                });
                var resp = {
                }
                return resolve(resp);


            } catch (Error) {
                console.log(Error);
                return reject();
            }

        } else {

            let otp = customer.verifyOtp;
            customer = customer.toObject();
            customer.otp = otp;

            try {
                mail('sendOTPdMail')(customer.email, customer).send();

                await deliveryBoySchema.updateOne({ _id: customer._id }, {
                    $set: {
                        verifyOtp: otp
                    }
                });
                var resp = {
                }
                return resolve(resp);


            } catch (Error) {
                console.log(Error);
                return reject();
            }
        }

    });

}


//DB Related Image uplaod
function uploaddeliveryBoyImage(file, name) {
    return new Promise(function (resolve, reject) {
        console.log(file.name);
        //Get image extension
        var ext = getExtension(file.name);

        // The name of the input field (i.e. "image") is used to retrieve the uploaded file
        let sampleFile = file;

        var file_name = `${name}-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

        // Use the mv() method to place the file somewhere on your server
        sampleFile.mv(`public/img/deliveryboy/${file_name}`, function (err) {
            if (err) {
                console.log('err', err);
                return reject('error');
            } else {
                return resolve(file_name);
            }
        });
    });
}
