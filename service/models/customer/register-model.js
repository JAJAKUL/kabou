var async = require('async');
var jwt = require('jsonwebtoken');
var customerSchema = require('../../schema/Customer');
var deliveryBoySchema = require('../../schema/DeliveryBoy');
var vendorOwnerSchema = require('../../schema/VendorOwner');
var userDeviceLoginSchema = require('../../schema/UserDeviceLogin');
var vendorSchema = require('../../schema/Vendor');
var customerlogSchema = require('../../schema/CustomerLog');
const config = require('../../config');
const mail = require('../../modules/sendEmail');
var bcrypt = require('bcryptjs');

module.exports = {
    //Customer 
    customerRegistration: (data, callBack) => {
        if (data) {
            async.waterfall([
                function (nextCb) {
                    if (data.socialId) {

                        /** Check for customer existence */
                        customerSchema.countDocuments({ socialId: data.socialId }).exec(function (err, count) {
                            if (err) {
                                console.log(err);
                                nextCb(null, {
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            } if (count) {
                                // console.log(count);
                                nextCb(null, {
                                    success: false,
                                    STATUSCODE: 422,
                                    message: 'User already exists for this information.',
                                    response_data: {}
                                });
                            } else {
                                nextCb(null, {
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'success',
                                    response_data: {}
                                })
                            }
                        });

                    } else {
                        /** Check for customer existence */
                        customerSchema.countDocuments({ email: data.email, loginType: 'GENERAL' }).exec(function (err, count) {
                            if (err) {
                                console.log(err);
                                nextCb(null, {
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            } else {
                                if (count) {
                                    nextCb(null, {
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'User already exists for this email',
                                        response_data: {}
                                    });
                                } else {
                                    customerSchema.countDocuments({ phone: data.phone, loginType: 'GENERAL' }).exec(function (err, count) {
                                        if (err) {
                                            console.log(err);
                                            nextCb(null, {
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });

                                        } if (count) {
                                            nextCb(null, {
                                                success: false,
                                                STATUSCODE: 422,
                                                message: 'User already exists for this phone no.',
                                                response_data: {}
                                            });
                                        } else {
                                            nextCb(null, {
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'success',
                                                response_data: {}
                                            })
                                        }
                                    });
                                }
                            }
                        })

                    }
                },
                function (arg1, nextCb) {
                    if (arg1.STATUSCODE === 200) {
                        var customerdata = data;
                        customerdata.status = 'ACTIVE'

                        //Developer: Subhajit Singha
                        //Date: 20/02/2020
                        //Description: Update Login Type
                        var loginType = data.loginType;

                        if ((data.loginType == undefined) || (data.loginType == '')) { //IF NO SOCIAL SIGN UP THEN GENERAL LOGIN
                            loginType = 'GENERAL';
                            customerdata.status = 'INACTIVE'
                        } else {
                            mail('userRegistrationMail')(customerdata.email, {}).send();
                        }





                        customerdata.loginType = loginType;

                        new customerSchema(customerdata).save(async function (err, result) {
                            if (err) {
                                console.log(err);
                                nextCb(null, {
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            } else {

                                //SAVE LOG
                                var logObj = {
                                    customerId: result._id,
                                    type: 'Customer Registration',
                                    log: 'New Customer registered',
                                    addedTime: new Date()
                                }
                                saveCustomerLog(logObj);

                                updateUser({
                                    loginType: loginType
                                }, { _id: result._id });

                                console.log('loginType', loginType);
                                if (loginType == 'GENERAL') {
                                    var userOtp = await sendVerificationCode(result);

                                    var resUser = {
                                        userId: result._id
                                    }

                                    nextCb(null, {
                                        success: false,
                                        STATUSCODE: 200,
                                        message: 'Please check your email. We have sent a code to be used to verify your account.',
                                        response_data: resUser
                                    });
                                } else {

                                    //ADD DATA IN USER LOGIN DEVICE TABLE
                                    var userDeviceData = {
                                        userId: result._id,
                                        userType: 'CUSTOMER',
                                        appType: data.appType,
                                        pushMode: data.pushMode,
                                        deviceToken: data.deviceToken
                                    }

                                    await userDeviceLoginSchema.deleteMany({userId: result._id, appType: data.appType}, function (err) {
                                        if (err) {
                                            console.log(err);
                                        }
                                    });

                                    await userDeviceLoginSchema.deleteMany({ deviceToken: data.deviceToken }, function (err) {
                                        if (err) {
                                            console.log(err);
                                        }
                                    });


                                    new userDeviceLoginSchema(userDeviceData).save(async function (err, success) {
                                        if (err) {
                                            console.log(err);
                                            nextCb(null, {
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });
                                        } else {
                                            var loginId = success._id;


                                            const authToken = generateToken(result);



                                            if (data.profileImage != '') { // IF SOCIAL PROFILE PIC PRESENT THEN UPLOAD IT IN OUR SERVER

                                                const download = require('image-downloader')

                                                // Download to a directory and save with the original filename
                                                const options = {
                                                    url: data.profileImage,
                                                    dest: `public/img/profile-pic/`   // Save to /path/to/dest/image.jpg
                                                }
                                                const FileType = require('file-type');
                                                download.image(options)
                                                    .then(({ filename, image }) => {
                                                        (async () => {
                                                            var fileInfo = await FileType.fromFile(filename);
                                                            var fileExt = fileInfo.ext;
                                                            // console.log(fileExt);

                                                            var fs = require('fs');

                                                            var file_name = `customerprofile-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${fileExt}`;

                                                            let image_path = `public/img/profile-pic/${file_name}`;

                                                            fs.rename(filename, image_path, function (err) { //RENAME THE FILE
                                                                if (err) console.log('ERROR: ' + err);
                                                            })
                                                            updateUser({ //UPDATE THE DATA IN DB
                                                                profileImage: file_name
                                                            }, { _id: result._id });

                                                            var response = {
                                                                userDetails: {
                                                                    firstName: result.firstName,
                                                                    lastName: result.lastName,
                                                                    email: result.email,
                                                                    phone: result.phone.toString(),
                                                                    socialId: result.socialId,
                                                                    id: result._id,
                                                                    loginId: loginId,
                                                                    profileImage: `${config.serverhost}:${config.port}/img/profile-pic/` + file_name,
                                                                    userType: 'customer',
                                                                    loginType: result.loginType
                                                                },
                                                                authToken: authToken
                                                            }

                                                            nextCb(null, {
                                                                success: true,
                                                                STATUSCODE: 200,
                                                                message: 'Registration successfully.',
                                                                response_data: response
                                                            });

                                                        })();
                                                    })
                                            } else {

                                                var response = {
                                                    userDetails: {
                                                        firstName: result.firstName,
                                                        lastName: result.lastName,
                                                        email: result.email,
                                                        phone: result.phone.toString(),
                                                        socialId: result.socialId,
                                                        id: result._id,
                                                        loginId: loginId,
                                                        profileImage: '',
                                                        userType: 'customer',
                                                        loginType: result.loginType
                                                    },
                                                    authToken: authToken
                                                }

                                                nextCb(null, {
                                                    success: true,
                                                    STATUSCODE: 200,
                                                    message: 'Registration successfully.',
                                                    response_data: response
                                                });

                                            }

                                        }
                                    })

                                }





                            }
                        })
                    } else {
                        nextCb(null, arg1);
                    }
                },
                function (arg2, nextCb) {
                    if (arg2.STATUSCODE === 200) {
                        /** Send Registration Email */
                        // mail('userRegistrationMail')(arg2.response_data.userDetails.email, arg2.response_data.userDetails).send();
                        nextCb(null, arg2);
                    } else {
                        nextCb(null, arg2);
                    }
                }
            ], function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    callBack(result);
                }
            })
        }
    },
    customerLogin: (data, callBack) => {
        if (data) {

            var loginUser = '';
            var loginErrMsg = '';

            console.log('data-----------------------', data);


            if (data.loginType != 'EMAIL') {
                loginUser = 'SOCIAL';
                var loginCond = { socialId: data.user };
                loginErrMsg = 'Invalid login credentials'
            } else {
                if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(data.user)) {
                    var loginCond = { email: data.user, loginType: 'GENERAL' };
                    loginUser = 'EMAIL';
                    loginErrMsg = 'Invalid email or password'
                }
                else {
                    var loginCond = { phone: data.user, loginType: 'GENERAL' };
                    loginUser = 'PHONE';
                    loginErrMsg = 'Invalid phone or password'
                }
            }

            customerSchema.findOne(loginCond, async function (err, result) {

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
                            if (data.userType == 'admin') {
                                var userType = 'ADMIN'
                                data.appType = 'BROWSER';
                                data.pushMode = 'P';
                                data.deviceToken = '';
                            } else {
                                var userType = 'CUSTOMER'
                            }
                            //ADD DATA IN USER LOGIN DEVICE TABLE
                            var userDeviceData = {
                                userId: result._id,
                                userType: userType,
                                appType: data.appType,
                                pushMode: data.pushMode,
                                deviceToken: data.deviceToken
                            }

                            await userDeviceLoginSchema.deleteMany({userId: result._id, appType: data.appType}, function (err) {
                                if (err) {
                                    console.log(err);
                                }
                            });

                            await userDeviceLoginSchema.deleteMany({deviceToken: data.deviceToken}, function (err) {
                                if (err) {
                                    console.log(err);
                                }
                            });

                            new userDeviceLoginSchema(userDeviceData).save(async function (err, success) {
                                if (err) {
                                    console.log(err);
                                    nextCb(null, {
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error',
                                        response_data: {}
                                    });
                                } else {
                                    var loginId = success._id;
                                    if (loginUser == 'SOCIAL') { //IF SOCIAL LOGIN THEN NO NEED TO CHECK THE PASSWORD 
                                        const authToken = generateToken(result);
                                        let response = {
                                            userDetails: {
                                                firstName: result.firstName,
                                                lastName: result.lastName,
                                                email: result.email,
                                                countryCode: result.countryCode,
                                                phone: result.phone.toString(),
                                                socialId: result.socialId,
                                                id: result._id,
                                                loginId: loginId,
                                                profileImage: `${config.serverhost}:${config.port}/img/profile-pic/` + result.profileImage,
                                                userType: data.userType,
                                                loginType: data.loginType
                                            },
                                            authToken: authToken
                                        }

                                        //SAVE LOG
                                        var logObj = {
                                            customerId: result._id,
                                            type: 'Customer Login',
                                            log: 'Customer Login',
                                            addedTime: new Date()
                                        }
                                        saveCustomerLog(logObj);

                                        callBack({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: 'Login successfully',
                                            response_data: response
                                        })

                                    } else { //NORMAL LOGIN
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
                                                        firstName: result.firstName,
                                                        lastName: result.lastName,
                                                        email: result.email,
                                                        countryCode: result.countryCode,
                                                        phone: result.phone.toString(),
                                                        socialId: result.socialId,
                                                        id: result._id,
                                                        loginId: loginId,
                                                        profileImage: `${config.serverhost}:${config.port}/img/profile-pic/` + result.profileImage,
                                                        userType: data.userType,
                                                        loginType: data.loginType
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
                        if ((data.loginType != 'EMAIL') && (loginUser == 'SOCIAL')) {
                            callBack({
                                success: true,
                                STATUSCODE: 201,
                                message: 'New User',
                                response_data: {}
                            });
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
        }
    },
    customerVerifyUser: (req, callBack) => {
        if (req) {
            var data = req.body;

            console.log('data',data);

            var userId = data.userId;
            var verifyOtp = data.verificationCode;

            customerSchema.findOne({ _id: userId })
                .then(async (customer) => {
                    if (customer != null) {

                        var otpCheck = await customerSchema.findOne({ _id: userId, verifyOtp: verifyOtp });

                        if (otpCheck != null) {
                            var userResp = await customerSchema.updateOne({ _id: userId }, { $set: { status: 'ACTIVE' } });

                            mail('userRegistrationMail')(customer.email, {}).send();

                            //ADD DATA IN USER LOGIN DEVICE TABLE
                            var userDeviceData = {
                                userId: userId,
                                userType: 'CUSTOMER',
                                appType: data.appType,
                                pushMode: data.pushMode,
                                deviceToken: data.deviceToken
                            }

                            await userDeviceLoginSchema.deleteMany({userId: userId, appType: data.appType}, function (err) {
                                if (err) {
                                    console.log(err);
                                }
                            });
                            await userDeviceLoginSchema.deleteMany({deviceToken: data.deviceToken}, function (err) {
                                if (err) {
                                    console.log(err);
                                }
                            });

                            new userDeviceLoginSchema(userDeviceData).save(async function (err, success) {
                                if (err) {
                                    console.log(err);
                                    nextCb(null, {
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error',
                                        response_data: {}
                                    });
                                } else {
                                    var loginId = success._id;


                                    const authToken = generateToken(customer);

                                    var response = {
                                        userDetails: {
                                            firstName: customer.firstName,
                                            lastName: customer.lastName,
                                            email: customer.email,
                                            phone: customer.phone.toString(),
                                            socialId: customer.socialId,
                                            id: customer._id,
                                            loginId: loginId,
                                            profileImage: `${config.serverhost}:${config.port}/img/profile-pic/` + customer.profileImage,
                                            userType: 'customer',
                                            loginType: customer.loginType
                                        },
                                        authToken: authToken
                                    }


                                    //SAVE LOG
                                    var logObj = {
                                        customerId: customer._id,
                                        type: 'Customer Verify',
                                        log: 'Customer verified his account',
                                        addedTime: new Date()
                                    }
                                    saveCustomerLog(logObj);

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
            customerSchema.findOne({ email: data.email, loginType: 'GENERAL' }, function (err, customer) {
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
            customerSchema.findOne({ email: data.email, loginType: 'GENERAL' }, function (err, customer) {
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
                                customerSchema.updateOne({ _id: customer._id }, {
                                    $set: {
                                        password: hash
                                    }
                                }, async function (err, res) {
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
                                            userType: 'CUSTOMER',
                                            appType: data.appType,
                                            pushMode: data.pushMode,
                                            deviceToken: data.deviceToken
                                        }

                                        

                                        await userDeviceLoginSchema.deleteMany({userId: customer._id, appType: data.appType}, function (err) {
                                            if (err) {
                                                console.log(err);
                                            }
                                        });

                                        await userDeviceLoginSchema.deleteMany({ deviceToken: data.deviceToken }, function (err) {
                                            if (err) {
                                                console.log(err);
                                            }
                                        });

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
                                                        firstName: customer.firstName,
                                                        lastName: customer.lastName,
                                                        email: customer.email,
                                                        phone: customer.phone.toString(),
                                                        socialId: customer.socialId,
                                                        id: customer._id,
                                                        loginId: loginId,
                                                        profileImage: `${config.serverhost}:${config.port}/img/profile-pic/` + customer.profileImage,
                                                        userType: data.userType,
                                                        loginType: 'GENERAL'
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
            customerSchema.findOne({ email: data.email }, async function (err, customer) {
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
            customerSchema.findOne({ email: data.email, loginType: 'GENERAL' }, function (err, customer) {
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
    customerViewProfile: (data, callBack) => {
        if (data) {

            customerSchema.findOne({ _id: data.customerId }, function (err, customer) {
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
                            firstName: customer.firstName,
                            lastName: customer.lastName,
                            email: customer.email,
                            phone: customer.phone.toString(),
                            countryCode: customer.countryCode
                        }

                        if (customer.profileImage != '') {
                            response.profileImage = `${config.serverhost}:${config.port}/img/profile-pic/` + customer.profileImage
                        } else {
                            response.profileImage = ''
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
            /** Check for customer existence */

            let updateData = {
                firstName: data.firstName,
                lastName: data.lastName
            }

            updateUser(updateData, { _id: data.customerId });

            //SAVE LOG
            var logObj = {
                customerId: data.customerId,
                type: 'Customer Edit profile',
                log: 'Customer updated  profile info',
                addedTime: new Date()
            }
            saveCustomerLog(logObj);

            callBack({
                success: true,
                STATUSCODE: 200,
                message: 'User updated Successfully',
                response_data: {}
            })
        }
    },
    customerChangePassword: (data, callBack) => {
        if (data) {

            customerSchema.findOne({ _id: data.customerId }, function (err, result) {
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
                                    customerSchema.update({ _id: data.customerId }, {
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
                                            //SAVE LOG
                                            var logObj = {
                                                customerId: data.customerId,
                                                type: 'Customer Change Password',
                                                log: 'Customer changed his password',
                                                addedTime: new Date()
                                            }
                                            saveCustomerLog(logObj);

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
    customerProfileImageUpload: (data, callBack) => {
        if (data) {

            customerSchema.findOne({ _id: data.body.customerId }, function (err, result) {
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

                        var file_name = `customerprofile-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

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
                                 //SAVE LOG
                                 var logObj = {
                                    customerId: data.body.customerId,
                                    type: 'Customer Change Profile Image',
                                    log: 'Customer changed his profile image',
                                    addedTime: new Date()
                                }
                                saveCustomerLog(logObj);
                                
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
    //Delivery Boy
    deliveryboyLogin: (data, callBack) => {
        if (data) {
            var loginErrMsg = '';
            if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(data.user)) {
                var loginCond = { email: data.user };
                loginErrMsg = 'Invalid email or password'
            } else {
                var loginCond = { phone: data.user };
                loginErrMsg = 'Invalid phone or password'
            }

            deliveryBoySchema.findOne(loginCond, function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {
                        const comparePass = bcrypt.compareSync(data.password, result.password);
                        if (comparePass) {
                            const authToken = generateToken(result);
                            let response = {
                                userDetails: {
                                    firstName: result.firstName,
                                    lastName: result.lastName,
                                    email: result.email,
                                    phone: result.phone.toString(),
                                    cityId: result.cityId,
                                    location: result.location,
                                    id: result._id,
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
    deliveryboyForgotPassword: (data, callBack) => {
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
    deliveryboyResetPassword: (data, callBack) => {
        if (data) {
            deliveryBoySchema.findOne({ email: data.email }, { _id: 1 }, function (err, customer) {
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
                                deliveryBoySchema.update({ _id: customer._id }, {
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
                            message: 'User not found',
                            response_data: {}
                        });
                    }
                }
            })
        }
    },
    deliveryboyResendForgotPasswordOtp: (data, callBack) => {
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
    deliveryboyViewProfile: (data, callBack) => {
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
                            firstName: customer.firstName,
                            lastName: customer.lastName,
                            email: customer.email,
                            phone: customer.phone.toString(),
                            countryCode: customer.countryCode
                        }

                        if (customer.profileImage != '') {
                            response.profileImage = `${config.serverhost}:${config.port}/img/profile-pic/` + customer.profileImage
                        } else {
                            response.profileImage = ''
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
    deliveryboyEditProfile: (data, callBack) => {
        if (data) {
            /** Check for customer existence */
            deliveryBoySchema.countDocuments({ email: data.email, _id: { $ne: data.customerId } }).exec(function (err, count) {
                if (err) {
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
                        deliveryBoySchema.countDocuments({ phone: data.phone, _id: { $ne: data.customerId } }).exec(function (err, count) {
                            if (err) {
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

                                let updateData = {
                                    firstName: data.firstName,
                                    lastName: data.lastName,
                                    email: data.email,
                                    phone: data.phone,
                                    countryCode: data.countryCode,
                                }

                                updateDeliveryBoy(updateData, { _id: data.customerId });

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'User updated Successfully',
                                    response_data: {}
                                })

                            }
                        })
                    }
                }
            });
        }
    },
    deliveryboyChangePassword: (data, callBack) => {
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
    deliveryboyProfileImageUpload: (data, callBack) => {
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

                        var file_name = `dbprofile-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

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
                                updateDeliveryBoy({ profileImage: file_name }, { _id: data.body.customerId });
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
    //Vendor Owner
    vendorownerLogin: (data, callBack) => {

        if (data) {
            var loginErrMsg = '';
            if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(data.user)) {
                var loginCond = { email: data.user };
                loginErrMsg = 'Invalid email or password'
            } else {
                var loginCond = { phone: data.user };
                loginErrMsg = 'Invalid phone or password'
            }

            vendorOwnerSchema.findOne(loginCond, async function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {

                        console.log(result);
                        var vendorId = result.vendorId.toString();
                        var vendorResult = await vendorSchema.findOne({ _id: vendorId });

                        console.log(vendorResult);

                        if (vendorResult.status != 'INACTIVE') {

                            if (data.userType == 'vendoradmin') {
                                data.appType = 'BROWSER';
                                data.pushMode = 'P';
                                data.deviceToken = '';
                                var userType = 'VENDOR ADMIN';

                            } else {
                                var userType = 'VENDOR';
                            }
                            //ADD DATA IN USER LOGIN DEVICE TABLE
                            var userDeviceData = {
                                userId: result._id,
                                userType: userType,
                                appType: data.appType,
                                pushMode: data.pushMode,
                                deviceToken: data.deviceToken
                            }

                            await userDeviceLoginSchema.deleteMany({userId: result._id, appType: data.appType}, function (err) {
                                if (err) {
                                    console.log(err);
                                }
                            });

                            await userDeviceLoginSchema.deleteMany({ deviceToken: data.deviceToken }, function (err) {
                                if (err) {
                                    console.log(err);
                                }
                            });

                            new userDeviceLoginSchema(userDeviceData).save(async function (err, success) {
                                if (err) {
                                    console.log(err);
                                    nextCb(null, {
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error',
                                        response_data: {}
                                    });
                                } else {
                                    var loginId = success._id;
                                    const comparePass = bcrypt.compareSync(data.password, result.password);
                                    if (comparePass) {
                                        const authToken = generateToken(result);

                                        //Vendor Info
                                        var vendorInfo = await vendorSchema.findOne({ _id: result.vendorId });

                                        let response = {
                                            userDetails: {
                                                firstName: result.firstName,
                                                lastName: result.lastName,
                                                vendorId: result.vendorId,
                                                email: result.email,
                                                countryCode: result.countryCode,
                                                phone: result.phone.toString(),
                                                cityId: result.cityId,
                                                location: result.location,
                                                id: result._id,
                                                loginId: loginId,
                                                profileImage: `${config.serverhost}:${config.port}/img/vendor/${vendorInfo.logo}`,
                                                userType: data.userType,
                                                loginType: data.loginType
                                            },
                                            authToken: authToken,
                                            restaurantName: vendorInfo.restaurantName
                                        }

                                        callBack({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: 'Login successful',
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
                            })

                        } else {

                            var resUser = {
                                vendorId: result.vendorId,
                                email: result.email
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
    vendorownerForgotPassword: (data, callBack) => {
        if (data) {
            vendorOwnerSchema.findOne({ email: data.email }, function (err, customer) {
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
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Something went wrong while sending email.',
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
            })
        }
    },
    vendorownerResetPassword: (data, callBack) => {
        if (data) {
            vendorOwnerSchema.findOne({ email: data.email }, function (err, customer) {
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
                                vendorOwnerSchema.update({ _id: customer._id }, {
                                    $set: {
                                        password: hash
                                    }
                                }, async function (err, res) {
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
                                            userType: 'VENDOR',
                                            appType: data.appType,
                                            pushMode: data.pushMode,
                                            deviceToken: data.deviceToken
                                        }

                                        await userDeviceLoginSchema.deleteMany({userId: customer._id, appType: data.appType}, function (err) {
                                            if (err) {
                                                console.log(err);
                                            }
                                        });

                                        await userDeviceLoginSchema.deleteMany({ deviceToken: data.deviceToken }, function (err) {
                                            if (err) {
                                                console.log(err);
                                            }
                                        });

                                        new userDeviceLoginSchema(userDeviceData).save(async function (err, success) {
                                            if (err) {
                                                console.log(err);
                                                nextCb(null, {
                                                    success: false,
                                                    STATUSCODE: 500,
                                                    message: 'Internal DB error',
                                                    response_data: {}
                                                });
                                            } else {
                                                var loginId = success._id;

                                                //Vendor Info
                                                var vendorInfo = await vendorSchema.findOne({ _id: customer.vendorId });
                                                console.log(customer);
                                                const authToken = generateToken(customer);
                                                let response = {
                                                    userDetails: {
                                                        firstName: customer.firstName,
                                                        lastName: customer.lastName,
                                                        vendorId: customer.vendorId,
                                                        email: customer.email,
                                                        countryCode: customer.countryCode,
                                                        phone: customer.phone.toString(),
                                                        cityId: customer.cityId,
                                                        location: customer.location,
                                                        id: customer._id,
                                                        loginId: loginId,
                                                        profileImage: `${config.serverhost}:${config.port}/img/vendor/${vendorInfo.logo}`,
                                                        userType: data.userType,
                                                        loginType: data.loginType
                                                    },
                                                    authToken: authToken,
                                                    restaurantName: vendorInfo.restaurantName
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
    vendorownerResendOtp: (data, callBack) => {
        if (data) {
            vendorOwnerSchema.findOne({ email: data.email }, async function (err, customer) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (customer) {

                        var userOtp = await sendVendorVerificationCode(customer);

                        var resUser = {
                            vendorId: customer.vendorId,
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
    vendorownerResendForgotPasswordOtp: (data, callBack) => {
        if (data) {
            vendorOwnerSchema.findOne({ email: data.email }, function (err, customer) {
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
                            callBack({
                                success: true,
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
    vendorownerViewProfile: (data, callBack) => {
        if (data) {

            vendorOwnerSchema.findOne({ _id: data.customerId }, function (err, customer) {
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
                            firstName: customer.firstName,
                            lastName: customer.lastName,
                            email: customer.email,
                            phone: customer.phone.toString(),
                            countryCode: customer.countryCode
                        }

                        if (customer.profileImage != '') {
                            response.profileImage = `${config.serverhost}:${config.port}/img/profile-pic/` + customer.profileImage
                        } else {
                            response.profileImage = ''
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
    vendorownerEditProfile: (data, callBack) => {
        if (data) {
            /** Check for customer existence */
            vendorOwnerSchema.countDocuments({ email: data.email, _id: { $ne: data.customerId } }).exec(function (err, count) {
                if (err) {
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
                        vendorOwnerSchema.countDocuments({ phone: data.phone, _id: { $ne: data.customerId } }).exec(function (err, count) {
                            if (err) {
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

                                let updateData = {
                                    firstName: data.firstName,
                                    lastName: data.lastName,
                                    email: data.email,
                                    phone: data.phone,
                                    countryCode: data.countryCode,
                                }

                                updateVendor(updateData, { _id: data.customerId });

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'User updated Successfully',
                                    response_data: {}
                                })

                            }
                        })
                    }
                }
            });
        }
    },
    vendorownerChangePassword: (data, callBack) => {
        if (data) {

            vendorOwnerSchema.findOne({ _id: data.customerId }, function (err, result) {
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
                                    vendorOwnerSchema.update({ _id: data.customerId }, {
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
    vendorownerProfileImageUpload: (data, callBack) => {
        if (data) {
            vendorOwnerSchema.findOne({ _id: data.body.customerId }, function (err, result) {
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

                        var file_name = `vendorprofile-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

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
                                updateVendor({ profileImage: file_name }, { _id: data.body.customerId });
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
    //Admin
    adminForgotPassword: (data, callBack) => {
        if (data) {
            customerSchema.findOne({ email: data.email, userType: 'admin' }, function (err, customer) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (customer) {
                        var passwordReset = {};
                        passwordReset.password = generatePassword();
                        passwordReset.firstName = customer.firstName;
                        passwordReset.email = customer.email;
                        passwordReset.adminLink = `${config.adminUrl}forgotpassword/${customer._id}`;

                        try {
                            mail('forgotPasswordAdminMail')(customer.email, passwordReset).send();
                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: 'Please check your email to setup your password.',
                                response_data: {}
                            });
                        } catch (Error) {
                            console.log(Error);
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
    adminResetPassword: (data, callBack) => {
        if (data) {
            customerSchema.findOne({ _id: data.id, userType: 'admin' }, function (err, customer) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (customer) {
                        // console.log(customer);
                        //  console.log(data.password);
                        bcrypt.hash(data.password, 8, function (err, hash) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong while setting the password',
                                    response_data: {}
                                });
                            } else {
                                // console.log(hash);
                                // console.log(customer._id);
                                customerSchema.update({ _id: customer._id }, {
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
                                        console.log(res);
                                        callBack({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: 'Password Changed successfully.',
                                            response_data: {}
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
    adminChangePassword: (data, callBack) => {
        if (data) {
            customerSchema.findOne({ _id: data.customerId }, function (err, result) {
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
                                    customerSchema.update({ _id: data.customerId }, {
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
    //Vendor Admin
    vendoradminForgotPassword: (data, callBack) => {
        if (data) {
            vendorOwnerSchema.findOne({ email: data.email }, function (err, customer) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (customer) {
                        var passwordReset = {};
                        passwordReset.password = generatePassword();
                        passwordReset.firstName = customer.firstName;
                        passwordReset.email = customer.email;
                        passwordReset.adminLink = `${config.adminUrl}forgotpassword/${customer._id}`;

                        try {
                            mail('forgotPasswordAdminMail')(customer.email, passwordReset).send();
                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: 'Please check your email to setup your password.',
                                response_data: {}
                            });
                        } catch (Error) {
                            console.log(Error);
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
    vendoradminResetPassword: (data, callBack) => {
        if (data) {
            vendorOwnerSchema.findOne({ _id: data.id }, function (err, customer) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (customer) {
                        // console.log(customer);
                        console.log(data.password);
                        bcrypt.hash(data.password, 8, function (err, hash) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong while setting the password',
                                    response_data: {}
                                });
                            } else {
                                console.log(hash);
                                console.log(customer._id);
                                customerSchema.update({ _id: customer._id }, {
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
                                        console.log(res);
                                        callBack({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: 'Password Changed successfully.',
                                            response_data: {}
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
    vendoradminChangePassword: (data, callBack) => {
        if (data) {
            console.log(data);
            vendorOwnerSchema.findOne({ _id: data.customerId }, function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {
                        console.log(result);
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
                                    vendorOwnerSchema.update({ _id: data.customerId }, {
                                        $set: {
                                            password: hash
                                        }
                                    }, function (err, res) {
                                        console.log(res);
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
    forgotEmail: (data, callBack) => {
        if (data) {

            if (data.userType == 'customer') {
                customerSchema.findOne({ phone: data.phone, countryCode: data.countryCode, loginType: 'GENERAL' }, function (err, customer) {
                    if (err) {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    } else {
                        if (customer) {
                            if (customer != null) {
                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Customer email.',
                                    response_data: {
                                        email: customer.email
                                    }
                                })
                            } else {
                                callBack({
                                    success: false,
                                    STATUSCODE: 422,
                                    message: 'User not found.',
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
                })
            } else if (data.userType == 'vendorowner') {
                vendorSchema.findOne({ contactPhone: data.phone, countryCode: data.countryCode }, async function (err, customer) {
                    if (err) {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    } else {
                        if (customer) {
                            if (customer != null) {

                                var vendorOwnerEmail = await vendorOwnerSchema.findOne({ vendorId: customer._id });


                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Customer email.',
                                    response_data: {
                                        email: vendorOwnerEmail.email
                                    }
                                })
                            } else {
                                callBack({
                                    success: false,
                                    STATUSCODE: 422,
                                    message: 'User not found.',
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
                })
            }

        }
    },
    verifyMobileOTP: (data, callBack) => {
        if (data) {

            if (data.userType == 'customer') {
                customerSchema.findOne({ _id: data.customerId }, function (err, customer) {
                    if (err) {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    } else {
                        if (customer) {

                            const accountSid = config.twilio.TWILIO_SID;
                            const authToken = config.twilio.TWILIO_AUTHTOKEN;
                            const client = require('twilio')(accountSid, authToken);

                            var sid = data.sid;
                            if ((sid == '1234') && (config.twilio.testMode == 'YES')) {

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'User verified successfully.',
                                    response_data: {
                                        email: customer.email
                                    }
                                })
                            } else {

                                var countryCode = customer.countryCode;
                                var serchCountry = countryCode.indexOf("+");

                                if (serchCountry < 0) {
                                    countryCode = `+${countryCode}`;
                                }

                                var code = data.verificationCode;
                                var phoneNo = `${countryCode}${customer.phone}`;

                                client.verify.services(sid)
                                    .verificationChecks
                                    .create({ to: phoneNo, code: code })
                                    .then(async function (verification_check) {
                                        if (verification_check.status == 'approved') {
                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'User verified successfully.',
                                                response_data: {
                                                    email: customer.email
                                                }
                                            })
                                        } else {
                                            callBack({
                                                success: false,
                                                STATUSCODE: 422,
                                                message: 'Invalid verification code.',
                                                response_data: {}
                                            })

                                        }

                                    })
                                    .catch(function (err) {
                                        console.log(err);
                                        callBack({
                                            success: false,
                                            STATUSCODE: 500,
                                            message: 'Something went wrong.',
                                            response_data: {}
                                        })
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
                })
            } else if (data.userType == 'vendorowner') {
                vendorOwnerSchema.findOne({ phone: data.email }, function (err, customer) {
                    if (err) {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    } else {
                        if (customer) {

                            const accountSid = config.twilio.TWILIO_SID;
                            const authToken = config.twilio.TWILIO_AUTHTOKEN;
                            const client = require('twilio')(accountSid, authToken);

                            var sid = data.sid;
                            if ((sid == '1234') && (config.twilio.testMode == 'YES')) {

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'User verified successfully.',
                                    response_data: {
                                        email: customer.email
                                    }
                                })
                            } else {

                                var code = data.verificationCode;
                                var phoneNo = `${customer.countryCode}${customer.phone}`;

                                client.verify.services(sid)
                                    .verificationChecks
                                    .create({ to: phoneNo, code: code })
                                    .then(async function (verification_check) {
                                        if (verification_check.status == 'approved') {
                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'User verified successfully.',
                                                response_data: {
                                                    email: customer.email
                                                }
                                            })
                                        } else {
                                            callBack({
                                                success: false,
                                                STATUSCODE: 422,
                                                message: 'Invalid verification code.',
                                                response_data: {}
                                            })

                                        }

                                    })
                                    .catch(function (err) {
                                        console.log(err);
                                        callBack({
                                            success: false,
                                            STATUSCODE: 500,
                                            message: 'Something went wrong.',
                                            response_data: {}
                                        })
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
                })
            }

        }
    },
    //verify User Before Changing Email/Phone
    verifyUser: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;


            customerSchema
                .findOne({ _id: reqBody.customerId })
                .then((customerres) => {
                    if (customerres != null) {
                        if (reqBody.verifyType === 'EMAIL') {


                            let forgotPasswordOtp = Math.random().toString().replace('0.', '').substr(0, 6);
                            customer = {};
                            customer.forgotPasswordOtp = forgotPasswordOtp;
                            try {
                                mail('verifyUserlMail')(customerres.email, customer).send();


                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Please check your email. We have sent a code to be used to update your phone.',
                                    response_data: {
                                        email: customerres.email,
                                        otp: forgotPasswordOtp
                                    }
                                })
                            } catch (Error) {
                                console.log('Something went wrong while sending email', Error);

                                callBack({
                                    success: false,
                                    STATUSCODE: 422,
                                    message: 'Something went wrong.',
                                    response_data: {}
                                });
                            }

                        } else if (reqBody.verifyType === 'PHONE') {

                            // console.log(customerres);
                            // return;

                            var countryCode = customerres.countryCode;
                            var serchCountry = countryCode.indexOf("+");

                            if (serchCountry < 0) {
                                countryCode = `+${countryCode}`;
                            }

                            sendSMS(countryCode, customerres.phone)
                                .then((respons) => {

                                    var respData = {
                                        sid: respons.serviceSid
                                    }

                                    callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: 'Please check your phone. We have sent a code to be used to update your email.',
                                        response_data: respData
                                    })

                                })
                                .catch((respErr) => {
                                    console.log('Something went wrong while sending phone OTP', respErr);

                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'Something went wrong.',
                                        response_data: {}
                                    });
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

            customerSchema
                .findOne({ email: reqBody.email })
                .then((customerres) => {

                    if (customerres == null) {
                        customerSchema.update({ _id: reqBody.customerId }, {
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

            customerSchema
                .findOne({ phone: reqBody.phone })
                .then((customerRes) => {
                    if (customerRes == null) {
                        customerSchema.update({ _id: reqBody.customerId }, {
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

function generatePassword() {
    var length = 8,
        charset = "abcdefghijklmnop1234567890qrstuvwxyzABCDEFGH1234567890IJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

function generateToken(userData) {
    let payload = { subject: userData._id, user: 'CUSTOMER' };
    return jwt.sign(payload, config.secretKey, { expiresIn: '3600000h' })
}

function updateUser(update, cond) {
    return new Promise(function (resolve, reject) {
        customerSchema.update(cond, {
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

function updateDeliveryBoy(update, cond) {
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

function updateVendor(update, cond) {
    return new Promise(function (resolve, reject) {
        vendorOwnerSchema.update(cond, {
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

        var lastData = await customerSchema.findOne({ _id: customer._id });

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

                await customerSchema.updateOne({ _id: customer._id }, {
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

                await customerSchema.updateOne({ _id: customer._id }, {
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

function sendVendorVerificationCode(customer) {
    return new Promise(async function (resolve, reject) {

        var lastData = await vendorOwnerSchema.findOne({ _id: customer._id });

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

            console.log('customer', customer);
            try {
                mail('sendOTPdMail')(customer.email, customer).send();

                console.log('customer._id', customer._id);

                console.log('otp', otp);
                var userResp = await vendorOwnerSchema.updateOne({ _id: customer._id }, {
                    $set: {
                        otp: otp,
                        otpTime: new Date()
                    }
                });

                console.log('userResp', userResp);
                var resp = {
                }
                return resolve(resp);


            } catch (Error) {
                console.log(Error);
                return reject();
            }
        } else {
            let otp = customer.otp;
            customer = customer.toObject();
            customer.otp = otp;

            try {
                mail('sendOTPdMail')(customer.email, customer).send();

                console.log('customer._id', customer._id);

                console.log('otp', otp);
                var userResp = await vendorOwnerSchema.updateOne({ _id: customer._id }, {
                    $set: {
                        otp: otp
                    }
                });

                console.log('userResp', userResp);
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


function sendSMS(countryCode, phone) {
    return new Promise(function (resolve, reject) {
        var twilioMode = config.twilio.testMode;
        if (twilioMode == 'YES') {
            var resp = {
                serviceSid: '1234'
            }
            return resolve(resp);
        } else {
            //Twilio


            const accountSid = config.twilio.TWILIO_SID;
            const authToken = config.twilio.TWILIO_AUTHTOKEN;

            var frndlyName = config.twilio.friendlyName;

            const client = require('twilio')(accountSid, authToken);


            client.verify.services.create({ friendlyName: frndlyName })
                .then(function (service) {

                    var sid = service.sid;
                    var phoneNo = `${countryCode}${phone}`;

                    client.verify.services(sid)
                        .verifications
                        .create({ to: phoneNo, channel: 'sms' })
                        .then(function (verification) {
                            console.log(verification);
                            if (verification.status == 'pending') {
                                return resolve(verification);
                            } else {
                                return reject(verification);
                            }
                        })
                        .catch(function (err) {
                            return reject(err);
                        })
                })
                .catch(function (err) {
                    return reject(err);
                })
        }

    });
}


function saveCustomerLog(logObj) {

    new customerlogSchema(logObj).save(async function (err, result) {
        if (err) {
            console.log(err);

        } else {
            console.log('Log Saved');
        }

        await customerSchema.updateOne({ _id: logObj.customerId }, {
            $set: {
                lastModified: new Date()
            }
        });
    });
}
