var vendorSchema = require('../../schema/Vendor');
var vendorCategoriesSchema = require('../../schema/VendorCategory');
var mappingVendorCategoriesSchema = require('../../schema/MappingVendorCategory');
var vendorOwnerSchema = require('../../schema/VendorOwner');
var bannerSchema = require('../../schema/Banner');
var categorySchema = require('../../schema/Category');
var vandorTimeSchema = require('../../schema/VendorOpenCloseTime');
var userDeviceLoginSchema = require('../../schema/UserDeviceLogin');
var userNotificationSettingSchema = require('../../schema/UserNotificationSetting');
var ItemSchema = require('../../schema/Item');
var ItemExtraSchema = require('../../schema/ItemExtra');
var ItemOptionSchema = require('../../schema/ItemOption');
var vendorReviewSchema = require('../../schema/VendorReview');
var orderReviewSchema = require('../../schema/OrderReview');
var vendorlogSchema = require('../../schema/VendorLog');
const config = require('../../config');
const mail = require('../../modules/sendEmail');
var bcrypt = require('bcryptjs');
const UserNotificationSchema = require('../../schema/UserNotification');
const contentSchema = require('../../schema/Content');
const faqSchema = require('../../schema/Faq');
const AdminNotificationSchema = require('../../schema/AdminNotification');
var jwt = require('jsonwebtoken');

module.exports = {
    //Vendor Add 
    addVendor: async (data, callBack) => {
        if (data) {
            var files = data.files;
            var reqBody = data.body;


            /** Check for vendor existence */
            vendorOwnerSchema.findOne({ $or: [{ email: reqBody.restaurantEmail }, { phone: reqBody.restaurantPhone }] }, async function (err, respons) {
                if (err) {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (respons) {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'Restaurant already exists for this information.',
                            response_data: {}
                        });
                    } else {

                        if (files == null) {
                            var logoInfo = '';
                            var detailsInfo = ''
                            var licenceImageInfo = ''

                        } else {
                            if ((files.logo != undefined) && (files.logo != '')) {
                                //Image Upload
                                var logoInfo = await uploadvendorImage(files.logo, 'logo');
                            } else {
                                var logoInfo = ''
                            }


                            if ((files.banner != undefined) && (files.banner != '')) {
                                var detailsInfo = await uploadvendorImage(files.banner, 'detailsbanner');
                            } else {
                                var detailsInfo = ''
                            }

                            if ((files.licenceImage != undefined) && (files.licenceImage != '')) {
                                var licenceImageInfo = await uploadvendorImage(files.licenceImage, 'licence');
                            } else {
                                var licenceImageInfo = ''
                            }
                        }








                        if ((logoInfo != 'error') && (detailsInfo != 'error') && (licenceImageInfo != 'error')) {


                            var vendorUpData = {
                                restaurantName: reqBody.restaurantName,
                                managerName: reqBody.managerName,
                                restaurantType: reqBody.restaurantType,
                                contactEmail: reqBody.restaurantEmail,
                                countryCode: reqBody.countryCode,
                                contactPhone: reqBody.restaurantPhone,
                                description: reqBody.description,
                                logo: logoInfo,
                                banner: detailsInfo,
                                licenceImage: licenceImageInfo,
                                foodSafetyCertificate: '',
                                address: reqBody.location,
                                location: {
                                    type: 'Point',
                                    coordinates: [reqBody.longitude, reqBody.latitude]
                                },
                                isActive: false,
                                status: 'INACTIVE',
                                rating: 0,
                                delivery: true
                            };
                            new vendorSchema(vendorUpData).save(async function (err, result) {
                                if (err) {
                                    console.log(err);
                                    callBack({
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error',
                                        response_data: {}
                                    });
                                } else {
                                    var vendorId = result._id;
                                    var ownerPassword = generatePassword();
                                    var vendorOwner = {
                                        vendorId: vendorId,
                                        fullName: reqBody.managerName,
                                        email: reqBody.restaurantEmail,
                                        password: reqBody.password,
                                        phone: reqBody.restaurantPhone,
                                        countryCode: reqBody.countryCode,
                                        location: '',
                                        isActive: true
                                    }
                                    //VENDOR OWNER ADD
                                    new vendorOwnerSchema(vendorOwner).save(async function (err, user) {
                                        if (err) {
                                            console.log(err);
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });
                                        } else {
                                            //ADD DATA IN USER LOGIN DEVICE TABLE
                                            var userDeviceData = {
                                                userId: user._id,
                                                userType: 'VENDOR',
                                                appType: reqBody.appType,
                                                pushMode: reqBody.pushMode,
                                                deviceToken: reqBody.deviceToken
                                            }


                                            // new userDeviceLoginSchema(userDeviceData).save(async function (err, success) {
                                            //     if (err) {
                                            //         console.log(err);
                                            //         nextCb(null, {
                                            //             success: false,
                                            //             STATUSCODE: 500,
                                            //             message: 'Internal DB error',
                                            //             response_data: {}
                                            //         });
                                            //     } else {
                                            //Map Categories
                                            var vendorCategories = reqBody.restaurantType;
                                            var vendorCategoriesArr = vendorCategories.split(",");
                                            var mapVendorCatArr = [];
                                            if (vendorCategoriesArr.length > 0) {
                                                for (let vendorCategory of vendorCategoriesArr) {
                                                    var mapVendorCatObj = {};
                                                    var vendorCatCheck = await vendorCategoriesSchema.findOne({ categoryName: vendorCategory });

                                                    if (vendorCatCheck != null) {
                                                        mapVendorCatObj.vendorId = vendorId
                                                        mapVendorCatObj.vendorCategoryId = vendorCatCheck._id;
                                                    }

                                                    mapVendorCatArr.push(mapVendorCatObj);
                                                }
                                            }

                                            mappingVendorCategoriesSchema.insertMany(mapVendorCatArr, async function (err, mapresult) {
                                                if (err) {
                                                    console.log(err);
                                                    callBack({
                                                        success: false,
                                                        STATUSCODE: 500,
                                                        message: 'Internal DB error',
                                                        response_data: {}
                                                    });
                                                } else {
                                                    var userOtp = await sendVerificationCode(user);

                                                    var resUser = {
                                                        vendorId: result._id
                                                    }

                                                    //SAVE LOG
                                                    var logObj = {
                                                        vendorId: result._id,
                                                        type: 'Restaurant Registration',
                                                        log: 'New Restaurant registered',
                                                        addedTime: new Date()
                                                    }
                                                    saveVendorLog(logObj);

                                                    callBack({
                                                        success: true,
                                                        STATUSCODE: 200,
                                                        message: 'Please check your email. We have sent a code to be used to verify your account.',
                                                        response_data: resUser
                                                    });
                                                }
                                            });

                                            //     }
                                            // });
                                        }
                                    });
                                }
                            });
                        } else { //IF SOMEHOW LOGO UPLOAD FAILED
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Internal error, Something went wrong.',
                                response_data: {}
                            });
                        }




                    }

                }
            });
        }
    },
    //Vendor Types 
    vendorTypes: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;




            vendorCategoriesSchema
                .find({ isActive: true })
                .sort({ sortOrder: 'asc' })
                .then(async (vendorTypes) => {
                    var vendorTypesArr = [];

                    if (vendorTypes.length > 0) {
                        for (let vendorType of vendorTypes) {

                            var vendorTypesObj = {
                                _id: vendorType._id,
                                __v: vendorType.__v,
                                createdAt: vendorType.createdAt,
                                updatedAt: vendorType.updatedAt
                            };
                            vendorTypesObj.name = vendorType.categoryName;
                            vendorTypesObj.isActive = vendorType.isActive;

                            vendorTypesArr.push(vendorTypesObj);
                        }
                    }
                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'All restaurant  types',
                        response_data: { vendorTypes: vendorTypesArr }
                    });
                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });

                })



        }
    },
    //Vendor Time Add 
    addVendorTime: async (data, callBack) => {
        if (data) {
            // var files = data.files;
            //   var reqBody = data.body;
            // console.log(reqBody);
            // return;
            var files = data.files;
            var reqBody = data.body;

            var validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            var validZone = ['AM', 'PM'];
            var validDaysCurr = [];
            console.log(reqBody);
            var restaurantTime = reqBody.restaurantTime;

            if (typeof restaurantTime == 'string') {
                var restaurantTimeObj = JSON.parse(restaurantTime);
            } else {
                var restaurantTimeObj = restaurantTime;
            }



            //CHECK if Restaurant Time data is valid Json or not
            var checkJson = true;


            if (checkJson == true) {

                if ((restaurantTimeObj.length > 0) && (restaurantTimeObj.length <= 7)) {
                    var validateData = 0;
                    var restaurantTimeValArr = [];
                    for (let restaurantTimeVal of restaurantTimeObj) { //{ day: 'Monday', startTime: '10 AM', endTime: '10:30 PM' }
                        var restaurantTimeValdays = restaurantTimeVal.day; //Monday
                        var restaurantTimeValStartTime = restaurantTimeVal.startTime; //10 AM
                        var restaurantTimeValEndTime = restaurantTimeVal.endTime; //10:30 PM

                        if (validDays.includes(restaurantTimeValdays)) { //CHECK IF DAY IS VALID OR NOT
                            if (validDaysCurr.includes(restaurantTimeValdays)) {
                                continue;
                            } else {
                                var restaurantTimeValStartTimeCheck = restaurantTimeValStartTime.split(" "); //[ '10', 'AM' ]
                                var restaurantTimeValEndTimeCheck = restaurantTimeValEndTime.split(" "); //[ '10:30', 'PM' ]

                                if ((restaurantTimeValStartTimeCheck.length == 2) && (restaurantTimeValEndTimeCheck.length == 2)) { //THIS RESULT ALWAYS HAVE TO RETURN 2
                                    if ((validZone.includes(restaurantTimeValStartTimeCheck[1])) && (validZone.includes(restaurantTimeValEndTimeCheck[1]))) { //CHECK AM,PM STRING
                                        var restaurantTimeStartTimeFormatCheck = restaurantTimeValStartTimeCheck[0].split(":"); // [ '10' ]
                                        var restaurantTimeEndTimeFormatCheck = restaurantTimeValEndTimeCheck[0].split(":"); // [ '10','30' ]

                                        if ((!isNaN(restaurantTimeStartTimeFormatCheck[0])) && (!isNaN(restaurantTimeEndTimeFormatCheck[0]))) { //THIS VALUE MUST BE A NUMBER

                                            var restaurantTimeStartTimeLast = 0;
                                            if (restaurantTimeStartTimeFormatCheck[1] != undefined) {
                                                restaurantTimeStartTimeLast = restaurantTimeStartTimeFormatCheck[1];
                                            }

                                            var restaurantTimelastTimeLast = 0;
                                            if (restaurantTimeEndTimeFormatCheck[1] != undefined) {
                                                restaurantTimelastTimeLast = restaurantTimeEndTimeFormatCheck[1];
                                            }

                                            if ((!isNaN(restaurantTimeStartTimeLast)) && (!isNaN(restaurantTimelastTimeLast))) { //THIS VALUE MUST BE A NUMBER
                                                var startTimeAMPM = restaurantTimeValStartTimeCheck[1];
                                                var endTimeAMPM = restaurantTimeValEndTimeCheck[1];

                                                var startTimeFirst = Number(restaurantTimeStartTimeFormatCheck[0]);
                                                var endTimeFirst = Number(restaurantTimeEndTimeFormatCheck[0]);

                                                var startTimeLast = Number(restaurantTimeStartTimeLast);
                                                var endTimeLast = Number(restaurantTimelastTimeLast);

                                                //OPEN TIME
                                                if (startTimeAMPM == 'AM') {
                                                    var finalStartTime = ((startTimeFirst * 60) + startTimeLast);
                                                } else {
                                                    var finalStartTime = (((startTimeFirst + 12) * 60) + startTimeLast);
                                                }

                                                //CLOSE TIME
                                                if (endTimeAMPM == 'AM') {
                                                    var finalEndTime = ((endTimeFirst * 60) + endTimeLast);
                                                } else {
                                                    var finalEndTime = (((endTimeFirst + 12) * 60) + endTimeLast);
                                                }

                                                var vendorTimeData = {
                                                    vendorId: reqBody.vendorId,
                                                    day: restaurantTimeValdays,
                                                    openTime: finalStartTime,
                                                    closeTime: finalEndTime,
                                                    isActive: true
                                                }

                                                restaurantTimeValArr.push(vendorTimeData);

                                            } else {
                                                console.log('Start & End Time Format Invalid after :');
                                                validateData++;
                                            }

                                        } else {
                                            console.log('Start & End Time Format Invalid');
                                            validateData++;
                                        }

                                    } else {
                                        console.log('Start & End Time AM, PM Invalid');
                                        validateData++;
                                    }
                                } else {
                                    console.log('Start & End Time Format Invalid');
                                    validateData++;
                                }
                            }

                        } else {
                            console.log('DAY value Invalid');
                            validateData++;
                        }
                    }



                    if (validateData == 0) { //NO ERROR IN RESTAURANT TIME JSON FORMAT
                        // console.log('validateData', validateData);
                        // console.log(restaurantTimeValArr);

                        var updateVendor = {}


                        if (files != null) {
                            if (files.licenceImage != undefined) {
                                var licenseInfo = await uploadvendorImage(files.licenceImage, 'licence');
                            }
                            if (files.foodSafetyCertificate != undefined) {
                                var foodSafetyCertificateInfo = await uploadvendorImage(files.foodSafetyCertificate, 'foodsafety');
                            }
                            updateVendor.status = 'WAITING_FOR_APPROVAL';
                        } else {
                            var licenseInfo = ''
                            var foodSafetyCertificateInfo = ''
                        }



                        if ((licenseInfo != 'error') && (foodSafetyCertificateInfo != 'error')) {

                            var vendorTimeArray = [];

                            vandorTimeSchema.insertMany(restaurantTimeValArr, function (err, result) {
                                if (err) {
                                    console.log(err);
                                    callBack({
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error',
                                        response_data: {}
                                    });
                                } else {
                                    if (result) {
                                        for (let resultVal of result) {
                                            vendorTimeArray.push(resultVal._id);
                                        }
                                        updateVendor.vendorOpenCloseTime = vendorTimeArray;
                                        updateVendor.licenceImage = licenseInfo;
                                        updateVendor.foodSafetyCertificate = foodSafetyCertificateInfo;
                                        updateVendor.restaurantClose = false;
                                    }

                                    vendorSchema.update({ _id: reqBody.vendorId }, {
                                        $set: updateVendor
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
                                                vendorId: reqBody.vendorId,
                                                type: 'Restaurant Time Added',
                                                log: 'Restaurant added its time',
                                                addedTime: new Date()
                                            }
                                            saveVendorLog(logObj);

                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'Restaurant time data added successfully.',
                                                response_data: {}
                                            });
                                        }
                                    });
                                }

                            });
                        } else {
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Internal error, Something went wrong.',
                                response_data: {}
                            });
                        }
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'Invalid Restaurant time format.',
                            response_data: {}
                        });
                    }
                    // console.log(validateData);
                } else {
                    callBack({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Restaurant time required.',
                        response_data: {}
                    });
                }

            } else {
                callBack({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Invalid Restaurant time format.',
                    response_data: {}
                });
            }

            // console.log(JSON.parse(reqBody.restaurantTime));

        }
    },
    //Vendor Owner Add 
    vendorOwnerRegister: async (data, callBack) => {
        if (data) {

            /** Check for customer existence */
            vendorOwnerSchema.countDocuments({ email: data.email }).exec(function (err, count) {
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
                        vendorOwnerSchema.countDocuments({ phone: data.phone }).exec(function (err, count) {
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
                                new vendorOwnerSchema(data).save(async function (err, result) {
                                    if (err) {
                                        console.log(err);
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
                                            message: 'Restaurant Owner added successfully',
                                            response_data: result
                                        })
                                    }
                                });
                            }
                        });

                    }
                }
            });
        }
    },
    vendorVerifyUser: (req, callBack) => {
        if (req) {
            var data = req.body;

            var vendorId = data.vendorId;
            var verifyOtp = data.verificationCode;
            var isLogin = data.isLogin;

            vendorSchema.findOne({ _id: vendorId })
                .then(async (vendorInfo) => {
                    if (vendorInfo != null) {

                        var otpCheck = await vendorOwnerSchema.findOne({ vendorId: vendorId, otp: verifyOtp });

                        if (otpCheck != null) {
                            var userResp = await vendorSchema.updateOne({ _id: vendorId }, { $set: { status: 'PENDING_FOR_LICENSE' } });

                            if (isLogin == true) {

                                var userDeviceData = {
                                    userId: otpCheck._id,
                                    userType: 'VENDOR',
                                    appType: data.appType,
                                    pushMode: data.pushMode,
                                    deviceToken: data.deviceToken
                                }

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


                                        const authToken = generateToken(otpCheck);


                                        let response = {
                                            userDetails: {
                                                firstName: otpCheck.firstName,
                                                lastName: otpCheck.lastName,
                                                vendorId: otpCheck.vendorId,
                                                email: otpCheck.email,
                                                countryCode: otpCheck.countryCode,
                                                phone: otpCheck.phone.toString(),
                                                cityId: otpCheck.cityId,
                                                location: otpCheck.location,
                                                id: otpCheck._id,
                                                loginId: loginId,
                                                profileImage: `${config.serverhost}:${config.port}/img/vendor/${vendorInfo.logo}`,
                                                userType: data.userType,
                                                loginType: data.loginType
                                            },
                                            authToken: authToken,
                                            restaurantName: vendorInfo.restaurantName
                                        }

                                        //SAVE LOG
                                        var logObj = {
                                            vendorId: otpCheck.vendorId,
                                            type: 'Restaurant Verification',
                                            log: 'Restaurant verified their account',
                                            addedTime: new Date()
                                        }
                                        saveVendorLog(logObj);

                                        mail('vendorRegistrationMail')(vendorInfo.contactEmail, {}).send();

                                        callBack({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: 'Login successful',
                                            response_data: response
                                        })

                                    }
                                });

                            } else {
                                mail('vendorRegistrationMail')(vendorInfo.contactEmail, {}).send();
                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'You have registered successfully.',
                                    response_data: vendorInfo
                                })

                            }

                        } else {
                            callBack({
                                success: false,
                                STATUSCODE: 422,
                                message: 'Wrong OTP, please check your email.',
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
    //Item Add
    addItem: async (data, callBack) => {
        if (data) {
            var files = data.files;
            var reqBody = data.body;

            var itemExtra = reqBody.itemExtra;

            //CHECK if extra Item data is valid Json or not
            if (itemExtra == '') {
                var checkJson = true
            } else {
                var checkJson = await isJson(itemExtra);
            }

            var itemOption = reqBody.itemOption;

            //CHECK if extra Item data is valid Json or not
            if (itemOption == '') {
                var checkJsonOption = true
            } else {
                var checkJsonOption = await isJson(itemOption);
            }


            if ((checkJson == true) && (checkJsonOption == true)) {
                if (itemExtra != '') {
                    var itemExtraObj = JSON.parse(itemExtra);
                } else {
                    var itemExtraObj = [];
                }

                if (itemOption != '') {
                    var itemOptionObj = JSON.parse(itemOption);
                } else {
                    var itemOptionObj = [];
                }

                //License Upload
                if (files.menuImage != undefined) {
                    var menuImage = await uploadvendorImage(files.menuImage, 'menuImage');
                }

                if (menuImage != 'error') {

                    var itemprice = parseInt(reqBody.price).toFixed(2);

                    if (reqBody.validityFrom == '') {
                        var validityFrom = ''
                        var validityTo = ''
                    } else {
                        var validityFrom = createDateFormat(reqBody.validityFrom)
                        var validityTo = createDateFormat(reqBody.validityTo)
                    }
                    var itemData = {
                        itemName: reqBody.itemName,
                        categoryId: reqBody.categoryId,
                        vendorId: reqBody.vendorId,
                        type: reqBody.type,
                        description: reqBody.description,
                        ingredients: reqBody.ingredients,
                        recipe: reqBody.recipe,
                        price: reqBody.price,
                        waitingTime: reqBody.waitingTime,
                        menuImage: menuImage,
                        itemOptions: itemOptionObj,
                        discountType: reqBody.discountType,
                        discountAmount: reqBody.discountAmount,
                        validityFrom: validityFrom,
                        validityTo: validityTo,
                        isActive: true,
                        isApprove: false
                    };

                    console.log(itemData);

                    new ItemSchema(itemData).save(async function (err, result) {
                        if (err) {
                            console.log(err);
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Internal DB error',
                                response_data: {}
                            });
                        } else {
                            //Item Extra Add
                            var itemOptnsArr = [];
                            if (itemOptionObj.length > 0) {
                                for (let itemOptions of itemOptionObj) {
                                    var itmOptions = {};
                                    itmOptions.itemId = result._id;
                                    itmOptions.headerName = itemOptions.optionTitle;
                                    itmOptions.isActive = itemOptions.isActive;
                                    itmOptions.itemOptions = itemOptions.arrOptions;

                                    itemOptnsArr.push(itmOptions);
                                }
                            }
                            //Item Extra Add

                            if (itemOptnsArr.length > 0) {
                                ItemOptionSchema.insertMany(itemOptnsArr);
                            }


                            if (itemExtraObj.length > 0) {
                                var validateJson = 0;
                                var itemExtraArr = [];
                                for (let itemExtraObjVal of itemExtraObj) {
                                    console.log(itemExtraObjVal);
                                    var itemExtraName = itemExtraObjVal.name;
                                    var itemExtraPrice = itemExtraObjVal.price;
                                    var itemExtraStatus = itemExtraObjVal.isActive;

                                    if ((itemExtraStatus == undefined) || (itemExtraStatus == '')) {
                                        itemExtraStatus = false;
                                    }
                                    if ((itemExtraName != undefined) && (itemExtraPrice != undefined)) {
                                        if ((isNaN(itemExtraName)) && (!isNaN(itemExtraPrice))) {
                                            var itemObj = {
                                                itemId: result._id,
                                                itemName: itemExtraName,
                                                description: '',
                                                ingredients: '',
                                                recipe: '',
                                                price: itemExtraPrice,
                                                isActive: itemExtraStatus
                                            }
                                            itemExtraArr.push(itemObj);
                                        } else {
                                            console.log('Extra Item name should be string and price should be number');
                                            validateJson++;
                                        }

                                    } else {
                                        console.log('Extra Item name and price required');
                                        validateJson++;
                                    }
                                }

                                if (validateJson == 0) {
                                    console.log('extra', itemExtraArr);
                                    ItemExtraSchema.insertMany(itemExtraArr, function (err, result) {
                                        if (err) {
                                            console.log(err);
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });
                                        } else {
                                            //SAVE LOG
                                            var logObj = {
                                                vendorId: reqBody.vendorId,
                                                type: 'Restaurant Add Menu Item',
                                                log: `Restaurant added a menu item (${reqBody.itemName})`,
                                                addedTime: new Date()
                                            }
                                            saveVendorLog(logObj);
                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'Item added successfully',
                                                response_data: {}
                                            })
                                        }
                                    });

                                } else {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'Invalid Item extra value.',
                                        response_data: {}
                                    });
                                }
                            } else {
                                //SAVE LOG
                                var logObj = {
                                    vendorId: reqBody.vendorId,
                                    type: 'Restaurant Add Menu Item',
                                    log: `Restaurant added a menu item (${reqBody.itemName})`,
                                    addedTime: new Date()
                                }
                                saveVendorLog(logObj);
                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Item added successfully',
                                    response_data: {}
                                })
                            }

                        }
                    });
                } else {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Menu image upload failed.',
                        response_data: {}
                    });
                }
            } else {
                callBack({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Invalid Item extra value.',
                    response_data: {}
                });
            }

        }
    },
    //Item Get
    getItem: async (data, callBack) => {
        if (data) {
            var files = data.files;
            var reqBody = data.body;

            var vendorId = reqBody.vendorId;
            var itemId = reqBody.itemId;

            var itemCond = { vendorId: vendorId }
            itemCond._id = itemId;


            ItemSchema
                .findOne(itemCond)
                .then(async (item) => {
                    var allItems = [];
                    if (item != null) {

                        var extraitem = await ItemExtraSchema.find({ itemId: itemId }, { _id: 1, itemName: 1, price: 1, isActive: 1 });


                        if (item.validityFrom != null) {
                            var validityFrom = listDateFormat(item.validityFrom);
                            var validityTo = listDateFormat(item.validityTo);
                        } else {
                            var validityFrom = '';
                            var validityTo = '';
                        }
                        var itemsObj = {
                            itemName: item.itemName,
                            categoryId: item.categoryId,
                            vendorId: item.vendorId,
                            type: item.type,
                            description: item.description,
                            ingredients: item.ingredients,
                            recipe: item.recipe,
                            price: item.price,
                            waitingTime: item.waitingTime,
                            menuImage: item.menuImage,
                            itemOptions: item.itemOptions,
                            discountType: item.discountType,
                            discountAmount: item.discountAmount,
                            validityFrom: validityFrom,
                            validityTo: validityTo,
                            isActive: item.isActive,
                            imageUrl: `${config.serverhost}:${config.port}/img/vendor/`,
                            _id: item._id,
                        }

                        itemsObj.itemExtra = extraitem;


                    }
                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Item list.',
                        response_data: { item: itemsObj }
                    });
                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Something went wrong.',
                        response_data: {}
                    });
                });


        }
    },
    //Item Get Options
    getItemOptions: async (data, callBack) => {
        if (data) {

            var reqBody = data.body;

            var vendorId = reqBody.vendorId;

            var itemCond = { vendorId: vendorId }


            ItemSchema
                .find(itemCond)
                .then(async (items) => {
                    var itemsArr = [];
                    if (items.length > 0) {
                        for (let item of items) {
                            var itemId = item._id;
                            var itemId = itemId.toString();

                            itemsArr.push(itemId);
                        }
                        // console.log(itemsArr);
                    }

                    if (itemsArr.length > 0) {
                        ItemOptionSchema.find({ itemId: { $in: itemsArr } })
                            .then((itemOptions) => {
                                if (itemOptions.length > 0) {
                                    var itemOptionsNameArr = [];
                                    for (itemOption of itemOptions) {

                                        var itmOp = itemOption.itemOptions;
                                        if (itmOp.length > 0) {
                                            for (let itmOptn of itmOp) {
                                                itemOptionsNameArr.push(itmOptn.name);

                                            }
                                        }



                                    }
                                    var itemOptionsNameArrunique = itemOptionsNameArr.filter(onlyUnique);

                                    var optionMainArr = [];
                                    if (itemOptionsNameArrunique.length > 0) {

                                        for (let itemOptionsNameArruniq of itemOptionsNameArrunique) {
                                            var optionMainObj = {
                                                name: itemOptionsNameArruniq
                                            };

                                            optionMainArr.push(optionMainObj);

                                        }
                                        console.log(optionMainArr);
                                    }
                                }


                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Unique Options data.',
                                    response_data: { options: optionMainArr }
                                });

                            })
                            .catch((err) => {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong.',
                                    response_data: {}
                                });
                            })
                    } else {
                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'Unique Options data.',
                            response_data: { options: [] }
                        });
                    }



                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Something went wrong.',
                        response_data: {}
                    });
                });


        }
    },
    //Item Get Extra
    getItemExtraName: async (data, callBack) => {
        if (data) {

            var reqBody = data.body;

            var vendorId = reqBody.vendorId;

            var itemCond = { vendorId: vendorId }


            ItemSchema
                .find(itemCond)
                .then(async (items) => {
                    var itemsArr = [];
                    if (items.length > 0) {
                        for (let item of items) {
                            var itemId = item._id;
                            var itemId = itemId.toString();

                            itemsArr.push(itemId);
                        }
                        // console.log(itemsArr);
                    }

                    if (itemsArr.length > 0) {
                        ItemExtraSchema.find({ itemId: { $in: itemsArr } })
                            .then((itemExtras) => {
                                if (itemExtras.length > 0) {
                                    var itemExtrasNameArr = [];
                                    for (itemExtra of itemExtras) {
                                        itemExtrasNameArr.push(itemExtra.itemName);
                                    }
                                    var itemExtrasNameArrunique = itemExtrasNameArr.filter(onlyUnique);

                                    var optionMainArr = [];
                                    if (itemExtrasNameArrunique.length > 0) {

                                        for (let itemOptionsNameArruniq of itemExtrasNameArrunique) {
                                            var optionMainObj = {
                                                name: itemOptionsNameArruniq
                                            };

                                            optionMainArr.push(optionMainObj);

                                        }
                                        console.log(optionMainArr);
                                    }
                                }


                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Unique Extra data.',
                                    response_data: { extras: optionMainArr }
                                });

                            })
                            .catch((err) => {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong.',
                                    response_data: {}
                                });
                            })
                    }



                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Something went wrong.',
                        response_data: {}
                    });
                });


        }
    },

    updateItem: async (data, callBack) => {
        if (data) {
            var files = data.files;
            var reqBody = data.body;
            //console.log(reqBody);
            var itemExtra = reqBody.itemExtra;

            //CHECK if extra Item data is valid Json or not
            if (itemExtra == '') {
                var checkJson = true
            } else {
                var checkJson = await isJson(itemExtra);
            }

            var itemOption = reqBody.itemOption;

            //CHECK if extra Item data is valid Json or not
            if (itemOption == '') {
                var checkJsonOption = true
            } else {
                var checkJsonOption = await isJson(itemOption);
            }


            if ((checkJson == true) && (checkJsonOption == true)) {
                if (itemExtra != '') {
                    var itemExtraObj = JSON.parse(itemExtra);
                } else {
                    var itemExtraObj = [];
                }

                if (itemOption != '') {
                    var itemOptionObj = JSON.parse(itemOption);
                } else {
                    var itemOptionObj = [];
                }

                ItemSchema
                    .findOne({ _id: reqBody.itemId })
                    .then(async (itemGet) => {

                        if (itemGet != null) {
                            // console.log('itemGet',itemGet);
                            // return;

                            var getdiscountAmount = itemGet.discountAmount;
                            var getdiscountType = itemGet.discountType;
                            var getvalidityFrom = listGetDateFormat(itemGet.validityFrom);
                            var getvalidityTo = listGetDateFormat(itemGet.validityTo);

                            var reqdiscountAmount = reqBody.discountAmount;
                            var reqdiscountType = reqBody.discountType;
                            var reqvalidityFrom = reqBody.validityFrom;
                            var reqvalidityTo = reqBody.validityTo;



                            var itemData = {}
                            //License Upload
                            console.log('files.menuImage', files.menuImage);
                            if (files.menuImage != undefined) {

                                if (itemGet.menuImage != '') {
                                    var fs = require('fs');
                                    var filePath = `public/img/vendor/${itemGet.menuImage}`;
                                    fs.unlink(filePath, (err) => { });
                                }
                                var menuImage = await uploadvendorImage(files.menuImage, 'menuImage');

                                // itemData.isApprove = false;

                                //console.log('itemData1',itemData);
                            }

                            if (menuImage != 'error') {

                                console.log('discountAmount', getdiscountAmount, reqdiscountAmount);
                                console.log('discountType', getdiscountType, reqdiscountType);
                                console.log('validityFrom', getvalidityFrom, reqvalidityFrom);
                                console.log('validityTo', getvalidityTo, reqvalidityTo);

                                console.log('itemName', itemGet.itemName, reqBody.itemName);
                                console.log('categoryId', itemGet.categoryId, reqBody.categoryId);
                                console.log('vendorId', itemGet.vendorId, reqBody.vendorId);
                                console.log('type', itemGet.type, reqBody.type);
                                console.log('price', itemGet.price, reqBody.price);
                                console.log('waitingTime', itemGet.waitingTime, reqBody.waitingTime);
                                console.log('menuImage', itemGet.menuImage, files.menuImage);

                                if (reqBody.isImageChange == undefined) {
                                    var isImageChange = 'NO'
                                } else {
                                    var isImageChange = reqBody.isImageChange
                                }


                                // if ((getdiscountAmount == reqdiscountAmount) && (Number(getdiscountType) == Number(reqdiscountType)) && (getvalidityFrom == reqvalidityFrom) && (getvalidityTo == reqvalidityTo)) {
                                // if ((itemGet.itemName == reqBody.itemName) && (itemGet.categoryId == reqBody.categoryId) && (itemGet.vendorId == reqBody.vendorId) && (itemGet.type == reqBody.type) && (Number(itemGet.price) == Number(reqBody.price)) && (itemGet.waitingTime == reqBody.waitingTime) && (isImageChange == 'NO')) {
                                //     itemData.isApprove = itemGet.isApprove;
                                // } else {
                                //     itemData.isApprove = false;
                                // }

                                // }


                                if (reqBody.validityFrom == '') {
                                    var validityFrom = ''
                                    var validityTo = ''
                                } else {
                                    var validityFrom = createDateFormat(reqBody.validityFrom)
                                    var validityTo = createDateFormat(reqBody.validityTo)
                                }



                                var itemprice = parseInt(reqBody.price).toFixed(2);

                                itemData.itemName = reqBody.itemName,
                                    itemData.categoryId = reqBody.categoryId,
                                    itemData.vendorId = reqBody.vendorId,
                                    itemData.type = reqBody.type,
                                    itemData.description = reqBody.description,
                                    itemData.ingredients = reqBody.ingredients,
                                    itemData.recipe = reqBody.recipe,
                                    itemData.price = reqBody.price,
                                    itemData.waitingTime = reqBody.waitingTime,
                                    itemData.menuImage = menuImage,
                                    itemData.itemOptions = itemOptionObj,
                                    itemData.discountType = reqBody.discountType,
                                    itemData.discountAmount = reqBody.discountAmount,
                                    itemData.validityFrom = validityFrom,
                                    itemData.validityTo = validityTo


                                console.log('itemData2', itemData);



                                ItemSchema.update({ _id: reqBody.itemId }, {
                                    $set: itemData
                                }, async function (err, result) {
                                    if (err) {
                                        console.log(err);
                                        callBack({
                                            success: false,
                                            STATUSCODE: 500,
                                            message: 'Internal DB error',
                                            response_data: {}
                                        });
                                    } else {

                                        //Send Admin Notification

                                        var restaurantData = await vendorSchema.findOne({_id: reqBody.vendorId});

                                        var adminNotObj = {
                                            notificationType: 'MENU',
                                            notificationTypeId: reqBody.itemId,
                                            title: 'Menu Update',
                                            content: `${restaurantData.restaurantName} restaurant updated '${reqBody.itemName}' menu item.`,
                                            isRead: 'NO'
                                        }


                                        new AdminNotificationSchema(adminNotObj).save(async function (err, adminNot) {});

                                        
                                        //Item Extra Add
                                        var itemOptnsArr = [];
                                        if (itemOptionObj.length > 0) {
                                            for (let itemOptions of itemOptionObj) {
                                                var itmOptions = {};
                                                itmOptions.itemId = reqBody.itemId;
                                                itmOptions.headerName = itemOptions.optionTitle;
                                                itmOptions.isActive = itemOptions.isActive;
                                                itmOptions.itemOptions = itemOptions.arrOptions;

                                                itemOptnsArr.push(itmOptions);
                                            }
                                        }
                                        //Item Extra Add

                                        await ItemOptionSchema.deleteMany({ itemId: reqBody.itemId });
                                        if (itemOptnsArr.length > 0) {
                                            ItemOptionSchema.insertMany(itemOptnsArr);
                                        }
                                        if (itemExtraObj.length > 0) {
                                            var validateJson = 0;
                                            var itemExtraArr = [];
                                            for (let itemExtraObjVal of itemExtraObj) {
                                                console.log(itemExtraObjVal);
                                                var itemExtraName = itemExtraObjVal.name;
                                                var itemExtraPrice = itemExtraObjVal.price;
                                                var itemExtraStatus = itemExtraObjVal.isActive;

                                                if ((itemExtraStatus == undefined) || (itemExtraStatus == '')) {
                                                    itemExtraStatus = false;
                                                }
                                                if ((itemExtraName != undefined) && (itemExtraPrice != undefined)) {
                                                    if ((isNaN(itemExtraName)) && (!isNaN(itemExtraPrice))) {
                                                        var itemObj = {
                                                            itemId: reqBody.itemId,
                                                            itemName: itemExtraName,
                                                            description: '',
                                                            ingredients: '',
                                                            recipe: '',
                                                            price: itemExtraPrice,
                                                            isActive: itemExtraStatus
                                                        }
                                                        itemExtraArr.push(itemObj);
                                                    } else {
                                                        console.log('Extra Item name should be string and price should be number');
                                                        validateJson++;
                                                    }

                                                } else {
                                                    console.log('Extra Item name and price required');
                                                    validateJson++;
                                                }
                                            }

                                            if (validateJson == 0) {
                                                console.log('extra', itemExtraArr);

                                                ItemExtraSchema.deleteMany({ itemId: reqBody.itemId }, function (err) {
                                                    if (err) console.log(err);


                                                    ItemExtraSchema.insertMany(itemExtraArr, function (err, result) {
                                                        if (err) {
                                                            console.log(err);
                                                            callBack({
                                                                success: false,
                                                                STATUSCODE: 500,
                                                                message: 'Internal DB error',
                                                                response_data: {}
                                                            });
                                                        } else {
                                                            //SAVE LOG
                                                            var logObj = {
                                                                vendorId: reqBody.vendorId,
                                                                type: 'Restaurant Update Menu Item',
                                                                log: `Restaurant updated a menu item (${reqBody.itemName})`,
                                                                addedTime: new Date()
                                                            }
                                                            saveVendorLog(logObj);

                                                            callBack({
                                                                success: true,
                                                                STATUSCODE: 200,
                                                                message: 'Item updated successfully',
                                                                response_data: {}
                                                            })
                                                        }
                                                    });
                                                });

                                            } else {
                                                callBack({
                                                    success: false,
                                                    STATUSCODE: 422,
                                                    message: 'Invalid Item extra value.',
                                                    response_data: {}
                                                });
                                            }
                                        } else {
                                            //SAVE LOG
                                            var logObj = {
                                                vendorId: reqBody.vendorId,
                                                type: 'Restaurant Update Menu Item',
                                                log: `Restaurant updated a menu item (${reqBody.itemName})`,
                                                addedTime: new Date()
                                            }
                                            saveVendorLog(logObj);
                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'Item updated successfully',
                                                response_data: {}
                                            })
                                        }

                                    }
                                });
                            } else {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Menu image upload failed.',
                                    response_data: {}
                                });
                            }
                        } else {
                            callBack({
                                success: false,
                                STATUSCODE: 422,
                                message: 'Item not found.',
                                response_data: {}
                            });
                        }

                    })
                    .catch((err) => {
                        console.log('err', err)
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Something went wrong.',
                            response_data: {}
                        });
                    })


            } else {
                callBack({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Invalid Item extra value.',
                    response_data: {}
                });
            }

        }
    },
    //Item Update status
    updateItemStatus: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;
            //console.log(reqBody);
            var isActive = reqBody.isActive;

            var itemData = {
                isActive: isActive,
            };

            console.log(itemData);

            ItemSchema.update({ _id: reqBody.itemId }, {
                $set: itemData
            }, async function (err, result) {
                if (err) {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    console.log(result);
                    if (result.nModified == 1) {
                        var itemInfo = await ItemSchema.findOne({ _id: reqBody.itemId });
                        //SAVE LOG
                        var logObj = {
                            vendorId: reqBody.vendorId,
                            type: 'Restaurant Item Status Change',
                            log: `Restaurant changed its item status (${itemInfo.itemName})`,
                            addedTime: new Date()
                        }
                        saveVendorLog(logObj);
                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'Item status updated successfully',
                            response_data: {}
                        })
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Something went wrong.',
                            response_data: {}
                        })
                    }

                }
            });
        }
    },
    //Item List
    itemList: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var vendorId = reqBody.vendorId;
            var categoryId = reqBody.categoryId;

            var itemCond = { vendorId: vendorId };

            if ((categoryId != undefined) && (categoryId != '')) {
                itemCond.categoryId = categoryId;
            }
            ItemSchema
                .find(itemCond)
                .then(async (items) => {
                    var categoryIds = [];
                    if (items.length > 0) {
                        for (let item of items) {
                            categoryIds.push(item.categoryId);

                        }
                    }

                    // var countforItem = await ItemSchema.find({ vendorId: vendorId });

                    // var categoryIds = [];
                    // if (items.length > 0) {
                    //     for (let item of items) {
                    //         categoryIds.push(item.categoryId);

                    //     }
                    // }

                    categorySchema.find({ _id: { $in: categoryIds }, categoryType: { $ne: 'FIXED' } }, { _id: 1, categoryName: 1 })
                        .sort({ sortOrder: 'asc' })
                        .then(async (categories) => {
                            var itemsArr = [];
                            var categoryArr = [];
                            if (categories.length > 0) {
                                for (let category of categories) {
                                    var catitemList = {};
                                    catitemList.category = category;
                                    var catItem = await ItemSchema.find({ vendorId: vendorId, categoryId: category._id });


                                    var itemsArra = [];
                                    if (catItem.length > 0) {
                                        for (let itmcat of catItem) {

                                            if (itmcat.validityFrom != null) {
                                                var validityFrom = listDateFormat(itmcat.validityFrom);
                                                var validityTo = listDateFormat(itmcat.validityTo);
                                            } else {
                                                var validityFrom = '';
                                                var validityTo = '';
                                            }
                                            var itemObj = {};
                                            itemObj.isActive = itmcat.isActive;
                                            itemObj._id = itmcat._id;
                                            itemObj.itemName = itmcat.itemName;
                                            itemObj.categoryId = itmcat.categoryId;
                                            itemObj.vendorId = itmcat.vendorId;
                                            itemObj.type = itmcat.type;
                                            itemObj.price = itmcat.price;
                                            itemObj.waitingTime = itmcat.waitingTime;
                                            itemObj.menuImage = itmcat.menuImage;
                                            itemObj.imageUrl = `${config.serverhost}:${config.port}/img/vendor/`;
                                            itemObj.itemOptions = itmcat.itemOptions;
                                            itemObj.discountType = itmcat.discountType;
                                            itemObj.discountAmount = itmcat.discountAmount;
                                            itemObj.validityFrom = validityFrom;
                                            itemObj.validityTo = validityTo;
                                            itemObj.createdAt = itmcat.createdAt;
                                            itemObj.updatedAt = itmcat.updatedAt;
                                            var extraitem = await ItemExtraSchema.find({ itemId: itmcat._id }, { _id: 1, itemName: 1, price: 1, isActive: 1 });

                                            itemObj.itemExtras = extraitem;

                                            itemsArra.push(itemObj);
                                        }
                                    }

                                    catitemList.items = itemsArra;


                                    itemsArr.push(catitemList);
                                }
                            }

                            var itemsAll = await ItemSchema.find({ vendorId: vendorId });

                            var categoryIdsArr = [];
                            if (itemsAll.length > 0) {
                                for (let item of itemsAll) {
                                    categoryIdsArr.push(item.categoryId);

                                }
                            }

                            var categoryCountsAll = await categorySchema.find({ _id: { $in: categoryIdsArr }, categoryType: { $ne: 'FIXED' } }, { _id: 1, categoryName: 1 });

                            if (categoryCountsAll.length > 0) {
                                for (let categoryCount of categoryCountsAll) {
                                    var catitemList = {};
                                    var catListObj = {};

                                    var catItem = await ItemSchema.find({ vendorId: vendorId, categoryId: categoryCount._id });





                                    catListObj.categoryName = categoryCount.categoryName;
                                    catListObj._id = categoryCount._id;
                                    catListObj.inItemCount = catItem.length;

                                    categoryArr.push(catListObj);
                                }
                            }

                            console.log('categoryArr', categoryArr);
                            console.log('itemsArr', itemsArr);


                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: 'Item list.',
                                response_data: { categoryList: categoryArr, itemlist: itemsArr }
                            });

                        })
                        .catch((err) => {
                            console.log(err);
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Something went wrong.',
                                response_data: {}
                            });
                        })

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Something went wrong.',
                        response_data: {}
                    });
                });


        }
    },
    //Item delete
    deleteItem: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var vendorId = reqBody.vendorId;

            var itemId = reqBody.itemId;

            ItemSchema
                .findOne({ _id: itemId, vendorId: vendorId })
                .then(async (item) => {
                    if (item != null) {

                        ItemSchema.deleteOne({ _id: itemId }, async function (err) {
                            if (err) {
                                console.log(err);
                            }
                            await ItemOptionSchema.deleteMany({ itemId: itemId });
                            await ItemExtraSchema.deleteMany({ itemId: itemId });

                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: 'Item deleted successfully.',
                                response_data: {}
                            });
                        });

                    }
                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Something went wrong.',
                        response_data: {}
                    });
                });


        }
    },
    getAllCategories: (data, callBack) => {
        if (data) {
            categorySchema.find({ isActive: true, categoryType: { $ne: 'FIXED' } }, { _id: 1, categoryName: 1 }, function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result.length) {
                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'success',
                            response_data: result
                        })
                    } else {
                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'No category found',
                            response_data: result
                        })
                    }

                }
            }).sort({ categoryName: 'asc' });
        }
    },
    //Vendor Details 
    getVendorDetails: async (data, callBack) => {
        if (data) {
            var files = data.files;
            var reqBody = data.body;


            /** Check for vendor existence */
            vendorSchema.findOne({ _id: reqBody.vendorId })
                .populate('vendorOpenCloseTime')
                .then(function (results) {

                    //Open time
                    var vendorTimeArr = [];
                    var openTimeArr = [];
                    var closeTimeArr = [];

                    var vendorLatlong = {
                        vendorLat: results.location.coordinates[1],
                        vendorLong: results.location.coordinates[0]
                    }


                    if (results.vendorOpenCloseTime.length > 0) {
                        if (results.vendorOpenCloseTime.length == 7) {
                            var everydayCheck = 1;
                        } else {
                            var everydayCheck = 0;
                        }


                        for (let vendorTime of results.vendorOpenCloseTime) {
                            var vendorTimeObj = {};
                            //  console.log(vendorTime);
                            if (everydayCheck == 1) {

                                openTimeArr.push(vendorTime.openTime);
                                closeTimeArr.push(vendorTime.closeTime);
                            }
                            //OPEN TIME CALCULATION
                            var openTimeAMPM = '';
                            var openTimeHours = '';
                            var openTimeMin = '';
                            if (vendorTime.openTime < 720) {
                                var num = vendorTime.openTime;
                                openTimeAMPM = 'AM';
                            } else {
                                var num = (vendorTime.openTime - 720);
                                openTimeAMPM = 'PM';
                            }

                            var openHours = (num / 60);
                            var openrhours = Math.floor(openHours);
                            var openminutes = (openHours - openrhours) * 60;
                            var openrminutes = Math.round(openminutes);

                            openTimeHours = openrhours;
                            openTimeMin = openrminutes;

                            if (openTimeMin < 10) {
                                openTimeMin = `${openTimeMin}0`
                            }
                            console.log(openTimeMin);
                            //CLOSE TIME CALCULATION
                            var closeTimeAMPM = '';
                            var closeTimeHours = '';
                            var closeTimeMin = '';
                            if (vendorTime.closeTime < 720) {
                                var num = vendorTime.closeTime;
                                closeTimeAMPM = 'AM';
                            } else {
                                var num = (vendorTime.closeTime - 720);
                                closeTimeAMPM = 'PM';
                            }

                            var closeHours = (num / 60);
                            var closerhours = Math.floor(closeHours);
                            var closeminutes = (closeHours - closerhours) * 60;
                            var closerminutes = Math.round(closeminutes);

                            closeTimeHours = closerhours;
                            closeTimeMin = closerminutes;

                            if (closeTimeMin < 10) {
                                closeTimeMin = `${closeTimeMin}0`
                            }

                            vendorTimeObj.day = vendorTime.day;
                            vendorTimeObj.openTime = `${openTimeHours}:${openTimeMin} ${openTimeAMPM}`
                            vendorTimeObj.closeTime = `${closeTimeHours}:${closeTimeMin} ${closeTimeAMPM}`
                            vendorTimeObj.isActive = vendorTime.isActive;

                            vendorTimeArr.push(vendorTimeObj);
                        }
                    }

                    var cacLicense = false;
                    if (results.licenceImage != '') {
                        cacLicense = true;
                    }

                    var foodSafety = false;
                    if (results.foodSafetyCertificate != '') {
                        foodSafety = true;
                    }

                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Restaurant profile view.',
                        response_data: { vendorTime: vendorTimeArr, vendorLatlong: vendorLatlong, vendor: results, imageUrl: `${config.serverhost}:${config.port}/img/vendor/`, cacLicense: cacLicense, foodSafety: foodSafety }
                    });

                })
                .catch(function (err) {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                });
            // , async function (err, respons) {
            // if (err) {
            //     console.log(err);
            //     callBack({
            //         success: false,
            //         STATUSCODE: 500,
            //         message: 'Internal DB error',
            //         response_data: {}
            //     });
            // } else {



            // }

        }
    },
    //Vendor Reviews 
    getVendorReviews: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;


            /** Check for vendor existence */
            orderReviewSchema.find({ vendorId: reqBody.vendorId })
                .then(function (reviews) {
                    var reviewsArr = [];
                    if (reviews.length > 0) {
                        for (let review of reviews) {
                            var reviewsObj = {
                                customerName: review.customerName,
                                comment: review.comment,
                                customerRating: review.customerRating,
                                reviewId: review._id
                            }

                            reviewsArr.push(reviewsObj);
                        }
                    }


                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Restaurant reviews.',
                        response_data: { reviews: reviewsArr }
                    });

                })
                .catch(function (err) {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                });
            // , async function (err, respons) {
            // if (err) {
            //     console.log(err);
            //     callBack({
            //         success: false,
            //         STATUSCODE: 500,
            //         message: 'Internal DB error',
            //         response_data: {}
            //     });
            // } else {



            // }

        }
    },
    //Update Vendor Reviews 
    updateVendorReviews: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var reviewReply = reqBody.reply;


            /** Check for vendor existence */
            orderReviewSchema.findOne({ vendorId: reqBody.vendorId, _id: reqBody.reviewId })
                .then(function (review) {

                    var comment = review.comment;
                    var restauratReply = {
                        restaurant: reviewReply
                    }

                    let mergedComment = { ...comment, ...restauratReply };

                    console.log(mergedComment);

                    var updateVendorComment = {
                        comment: mergedComment
                    }

                    orderReviewSchema.update({ _id: review._id }, {
                        $set: updateVendorComment
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
                                message: 'Restaurant review updated successfully.',
                                response_data: {}
                            });
                        }

                    })

                    // callBack({
                    //     success: true,
                    //     STATUSCODE: 200,
                    //     message: 'Restaurant reviews.',
                    //     response_data: { reviews: reviewsArr }
                    // });

                })
                .catch(function (err) {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                });


        }
    },
    //Vendor Details Update
    updateVendorDetails: async (data, callBack) => {
        if (data) {
            var files = data.files;
            var reqBody = data.body;


            var updateVendor = {
                restaurantName: reqBody.restaurantName,
                managerName: reqBody.managerName,
                restaurantType: reqBody.restaurantType,
                contactEmail: reqBody.restaurantEmail,
                countryCode: reqBody.countryCode,
                contactPhone: reqBody.restaurantPhone
            }

            vendorSchema.update({ _id: reqBody.vendorId }, {
                $set: updateVendor
            }, async function (err, res) {
                if (err) {
                    console.log('err', err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (res.nModified == 1) {
                        //Map Categories
                        var vendorCategories = reqBody.restaurantType;
                        var vendorCategoriesArr = vendorCategories.split(",");
                        var mapVendorCatArr = [];
                        if (vendorCategoriesArr.length > 0) {
                            for (let vendorCategory of vendorCategoriesArr) {
                                var mapVendorCatObj = {};
                                var vendorCatCheck = await vendorCategoriesSchema.findOne({ categoryName: vendorCategory });

                                console.log('vendorCatCheck', vendorCatCheck);
                                if (vendorCatCheck != null) {
                                    mapVendorCatObj.vendorId = reqBody.vendorId
                                    mapVendorCatObj.vendorCategoryId = vendorCatCheck._id;

                                    mapVendorCatArr.push(mapVendorCatObj);
                                }


                            }
                        }

                        await mappingVendorCategoriesSchema.deleteMany({ vendorId: reqBody.vendorId });

                        mappingVendorCategoriesSchema.insertMany(mapVendorCatArr, function (err, mapresult) {
                            if (err) {
                                console.log('err', err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            } else {

                                //SAVE LOG
                                var logObj = {
                                    vendorId: reqBody.vendorId,
                                    type: 'Update Restaurant Details',
                                    log: `Restaurant updated their details`,
                                    addedTime: new Date()
                                }
                                saveVendorLog(logObj);

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Restaurant data updated successfully.',
                                    response_data: {}
                                });
                            }
                        });
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Something went wrong',
                            response_data: {}
                        });
                    }


                }
            });



        }
    },
    //Vendor Location Update
    updateVendorLocation: async (data, callBack) => {
        if (data) {

            var reqBody = data.body;



            var updateVendor = {}

            updateVendor.address = reqBody.location,
                updateVendor.isActive = false;
            updateVendor.location = {
                type: 'Point',
                coordinates: [reqBody.longitude, reqBody.latitude]
            }

            vendorSchema.updateOne({ _id: reqBody.vendorId }, {
                $set: updateVendor
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
                        vendorId: reqBody.vendorId,
                        type: 'Update Restaurant Location',
                        log: `Restaurant updated their location`,
                        addedTime: new Date()
                    }
                    saveVendorLog(logObj);
                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Restaurant location updated successfully.',
                        response_data: {}
                    });
                }
            });



        }
    },

    //Vendor Time Update 
    updateVendorTime: async (data, callBack) => {
        if (data) {
            // var files = data.files;
            //   var reqBody = data.body;
            // console.log(reqBody);
            // return;
            var files = data.files;
            var reqBody = data.body;

            var validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            var validZone = ['AM', 'PM'];
            var restaurantTime = reqBody.restaurantTime;
            var validDaysCurr = [];

            var restaurantClose = reqBody.restaurantClose;

            //CHECK if Restaurant Time data is valid Json or not
            var checkJson = await isJson(restaurantTime);


            if (checkJson == true) {
                console.log(restaurantClose);
                if ((restaurantClose == true) || (restaurantClose == 'true')) {

                    var updateVendor = {
                        preOrder: reqBody.preOrder,
                        restaurantClose: reqBody.restaurantClose
                    }

                    updateVendor.address = reqBody.location,
                        updateVendor.location = {
                            type: 'Point',
                            coordinates: [reqBody.longitude, reqBody.latitude]
                        }

                    await vandorTimeSchema.deleteMany({ vendorId: reqBody.vendorId });

                    vendorSchema.update({ _id: reqBody.vendorId }, {
                        $set: updateVendor
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
                                vendorId: reqBody.vendorId,
                                type: 'Restaurant Closed',
                                log: `Restaurant changed the status to Closed`,
                                addedTime: new Date()
                            }
                            saveVendorLog(logObj);

                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: 'Restaurant time data added successfully.',
                                response_data: {}
                            });
                        }
                    });


                } else {
                    var restaurantTimeObj = JSON.parse(restaurantTime);

                    if ((restaurantTimeObj.length > 0) && (restaurantTimeObj.length <= 7)) {
                        var validateData = 0;
                        var restaurantTimeValArr = [];
                        for (let restaurantTimeVal of restaurantTimeObj) { //{ day: 'Monday', startTime: '10 AM', endTime: '10:30 PM' }
                            var restaurantTimeValdays = restaurantTimeVal.day; //Monday
                            var restaurantTimeValStartTime = restaurantTimeVal.startTime; //10 AM
                            var restaurantTimeValEndTime = restaurantTimeVal.endTime; //10:30 PM

                            if (validDays.includes(restaurantTimeValdays)) { //CHECK IF DAY IS VALID OR NOT
                                if (validDaysCurr.includes(restaurantTimeValdays)) {
                                    continue;
                                } else {
                                    var restaurantTimeValStartTimeCheck = restaurantTimeValStartTime.split(" "); //[ '10', 'AM' ]
                                    var restaurantTimeValEndTimeCheck = restaurantTimeValEndTime.split(" "); //[ '10:30', 'PM' ]

                                    if ((restaurantTimeValStartTimeCheck.length == 2) && (restaurantTimeValEndTimeCheck.length == 2)) { //THIS RESULT ALWAYS HAVE TO RETURN 2
                                        if ((validZone.includes(restaurantTimeValStartTimeCheck[1])) && (validZone.includes(restaurantTimeValEndTimeCheck[1]))) { //CHECK AM,PM STRING
                                            var restaurantTimeStartTimeFormatCheck = restaurantTimeValStartTimeCheck[0].split(":"); // [ '10' ]
                                            var restaurantTimeEndTimeFormatCheck = restaurantTimeValEndTimeCheck[0].split(":"); // [ '10','30' ]

                                            if ((!isNaN(restaurantTimeStartTimeFormatCheck[0])) && (!isNaN(restaurantTimeEndTimeFormatCheck[0]))) { //THIS VALUE MUST BE A NUMBER

                                                var restaurantTimeStartTimeLast = 0;
                                                if (restaurantTimeStartTimeFormatCheck[1] != undefined) {
                                                    restaurantTimeStartTimeLast = restaurantTimeStartTimeFormatCheck[1];
                                                }

                                                var restaurantTimelastTimeLast = 0;
                                                if (restaurantTimeEndTimeFormatCheck[1] != undefined) {
                                                    restaurantTimelastTimeLast = restaurantTimeEndTimeFormatCheck[1];
                                                }

                                                if ((!isNaN(restaurantTimeStartTimeLast)) && (!isNaN(restaurantTimelastTimeLast))) { //THIS VALUE MUST BE A NUMBER
                                                    var startTimeAMPM = restaurantTimeValStartTimeCheck[1];
                                                    var endTimeAMPM = restaurantTimeValEndTimeCheck[1];

                                                    var startTimeFirst = Number(restaurantTimeStartTimeFormatCheck[0]);
                                                    var endTimeFirst = Number(restaurantTimeEndTimeFormatCheck[0]);

                                                    var startTimeLast = Number(restaurantTimeStartTimeLast);
                                                    var endTimeLast = Number(restaurantTimelastTimeLast);

                                                    //OPEN TIME
                                                    if (startTimeAMPM == 'AM') {
                                                        var finalStartTime = ((startTimeFirst * 60) + startTimeLast);
                                                    } else {
                                                        var finalStartTime = (((startTimeFirst + 12) * 60) + startTimeLast);
                                                    }

                                                    //CLOSE TIME
                                                    if (endTimeAMPM == 'AM') {
                                                        var finalEndTime = ((endTimeFirst * 60) + endTimeLast);
                                                    } else {
                                                        var finalEndTime = (((endTimeFirst + 12) * 60) + endTimeLast);
                                                    }

                                                    validDaysCurr.push(restaurantTimeValdays)

                                                    var vendorTimeData = {
                                                        vendorId: reqBody.vendorId,
                                                        day: restaurantTimeValdays,
                                                        openTime: finalStartTime,
                                                        closeTime: finalEndTime,
                                                        isActive: true
                                                    }

                                                    restaurantTimeValArr.push(vendorTimeData);

                                                } else {
                                                    console.log('Start & End Time Format Invalid after :');
                                                    validateData++;
                                                }

                                            } else {
                                                console.log('Start & End Time Format Invalid');
                                                validateData++;
                                            }

                                        } else {
                                            console.log('Start & End Time AM, PM Invalid');
                                            validateData++;
                                        }
                                    } else {
                                        console.log('Start & End Time Format Invalid');
                                        validateData++;
                                    }
                                }

                            } else {
                                console.log('DAY value Invalid');
                                validateData++;
                            }
                        }



                        if (validateData == 0) { //NO ERROR IN RESTAURANT TIME JSON FORMAT
                            // console.log('validateData', validateData);
                            // console.log(restaurantTimeValArr);

                            var updateVendor = {
                                preOrder: reqBody.preOrder,
                                restaurantClose: reqBody.restaurantClose
                            }

                            vandorTimeSchema.deleteMany({ vendorId: reqBody.vendorId }, function (err) {
                                if (err) {

                                } else {
                                    var vendorTimeArray = [];

                                    vandorTimeSchema.insertMany(restaurantTimeValArr, function (err, result) {
                                        if (err) {
                                            console.log(err);
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });
                                        } else {
                                            if (result) {
                                                for (let resultVal of result) {
                                                    vendorTimeArray.push(resultVal._id);
                                                }
                                                updateVendor.vendorOpenCloseTime = vendorTimeArray;
                                                updateVendor.address = reqBody.location,
                                                    updateVendor.location = {
                                                        type: 'Point',
                                                        coordinates: [reqBody.longitude, reqBody.latitude]
                                                    }
                                            }

                                            vendorSchema.update({ _id: reqBody.vendorId }, {
                                                $set: updateVendor
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
                                                        vendorId: reqBody.vendorId,
                                                        type: 'Restaurant Time Update',
                                                        log: `Restaurant updated the open/close time`,
                                                        addedTime: new Date()
                                                    }
                                                    saveVendorLog(logObj);

                                                    callBack({
                                                        success: true,
                                                        STATUSCODE: 200,
                                                        message: 'Restaurant time data added successfully.',
                                                        response_data: {}
                                                    });
                                                }
                                            });
                                        }

                                    });
                                }


                            });
                        } else {
                            callBack({
                                success: false,
                                STATUSCODE: 422,
                                message: 'Invalid Restaurant time format.',
                                response_data: {}
                            });
                        }
                        // console.log(validateData);
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'Restaurant time required.',
                            response_data: {}
                        });
                    }
                }


            } else {
                callBack({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Invalid Restaurant time format.',
                    response_data: {}
                });
            }

            // console.log(JSON.parse(reqBody.restaurantTime));

        }
    },
    //verify User Before Changing Email/Phone
    verifyUser: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;


            vendorSchema
                .findOne({ _id: reqBody.vendorId })
                .then((vendorres) => {
                    if (vendorres != null) {

                        let forgotPasswordOtp = Math.random().toString().replace('0.', '').substr(0, 6);
                        customer = {};
                        customer.forgotPasswordOtp = forgotPasswordOtp;
                        try {
                            mail('verifyUserlMail')(vendorres.contactEmail, customer).send();
                            callBack({
                                success: false,
                                STATUSCODE: 200,
                                message: 'Please check your email. We have sent a code to be used to reset password.',
                                response_data: {
                                    email: customer.contactEmail,
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
    updateVendorEmail: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var updateVendor = {
                contactEmail: reqBody.restaurantEmail,
            }

            vendorSchema
                .findOne({ contactEmail: reqBody.restaurantEmail })
                .then((vendorres) => {

                    if (vendorres == null) {
                        vendorSchema.update({ _id: reqBody.vendorId }, {
                            $set: updateVendor
                        }, function (err, res) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            } else {
                                var vendorOwner = {
                                    email: reqBody.restaurantEmail,
                                }
                                vendorOwnerSchema.update({ vendorId: reqBody.vendorId }, {
                                    $set: vendorOwner
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
                                            vendorId: reqBody.vendorId,
                                            type: 'Restaurant Email Update',
                                            log: `Restaurant updated their email`,
                                            addedTime: new Date()
                                        }
                                        saveVendorLog(logObj);

                                        callBack({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: 'Restaurant email updated successfully.',
                                            response_data: {}
                                        });
                                    }
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
    updateVendorPhone: async (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var updateVendor = {
                countryCode: reqBody.countryCode,
                contactPhone: reqBody.restaurantPhone,
            }

            vendorSchema
                .findOne({ contactPhone: reqBody.restaurantPhone })
                .then((vendorres) => {

                    if (vendorres == null) {
                        vendorSchema.update({ _id: reqBody.vendorId }, {
                            $set: updateVendor
                        }, function (err, res) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            } else {
                                var vendorOwner = {
                                    phone: reqBody.restaurantPhone,
                                }
                                vendorOwnerSchema.update({ vendorId: reqBody.vendorId }, {
                                    $set: vendorOwner
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
                                            vendorId: reqBody.vendorId,
                                            type: 'Restaurant Phone Update',
                                            log: `Restaurant updated their phone`,
                                            addedTime: new Date()
                                        }
                                        saveVendorLog(logObj);

                                        callBack({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: 'Restaurant phone updated successfully.',
                                            response_data: {}
                                        });
                                    }
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
    //Banner Upload
    bannerUpload: (data, callBack) => {
        if (data) {
            var files = data.files;
            vendorSchema.findOne({ _id: data.body.vendorId }, async function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {
                        if (result.banner != '') {
                            var fs = require('fs');
                            var filePath = `public/img/vendor/${result.banner}`;
                            fs.unlink(filePath, (err) => { });
                        }

                        var detailsInfo = await uploadvendorImage(files.image, 'detailsbanner');
                        console.log(detailsInfo);
                        if (detailsInfo != 'error') {

                            vendorSchema.update({ _id: data.body.vendorId }, {
                                $set: { banner: detailsInfo }
                            }, function (err, result) {
                                console.log(result);

                                //SAVE LOG
                                var logObj = {
                                    vendorId: data.body.vendorId,
                                    type: 'Restaurant Banner Update',
                                    log: `Restaurant updated their banner`,
                                    addedTime: new Date()
                                }
                                saveVendorLog(logObj);

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Banner uploaded successfully.',
                                    response_data: {}
                                });

                            })

                        } else { //IF SOMEHOW LOGO UPLOAD FAILED
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Internal error, Something went wrong.',
                                response_data: {}
                            });
                        }
                    }
                }
            });


        }
    },
    //Logo Upload
    logoUpload: (data, callBack) => {
        if (data) {
            var files = data.files;
            vendorSchema.findOne({ _id: data.body.vendorId }, async function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {
                        if (result.logo != '') {
                            var fs = require('fs');
                            var filePath = `public/img/vendor/${result.logo}`;
                            fs.unlink(filePath, (err) => { });
                        }

                        var detailsInfo = await uploadvendorImage(files.image, 'logo');
                        console.log(detailsInfo);
                        if (detailsInfo != 'error') {

                            vendorSchema.update({ _id: data.body.vendorId }, {
                                $set: { logo: detailsInfo }
                            }, function (err, result) {
                                console.log(result);

                                //SAVE LOG
                                var logObj = {
                                    vendorId: data.body.vendorId,
                                    type: 'Restaurant Logo Update',
                                    log: `Restaurant updated their logo`,
                                    addedTime: new Date()
                                }
                                saveVendorLog(logObj);

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Restaurant logo uploaded successfully.',
                                    response_data: {}
                                });

                            })

                        } else { //IF SOMEHOW LOGO UPLOAD FAILED
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Internal error, Something went wrong.',
                                response_data: {}
                            });
                        }
                    }
                }
            });


        }
    },
    //Licence Upload
    licenceUpload: (data, callBack) => {
        if (data) {
            var files = data.files;
            vendorSchema.findOne({ _id: data.body.vendorId }, async function (err, result) {
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
                            var filePath = `public/img/vendor/${result.licenceImage}`;
                            fs.unlink(filePath, (err) => { });
                        }

                        var detailsInfo = await uploadvendorImage(files.image, 'licence');
                        console.log(detailsInfo);
                        if (detailsInfo != 'error') {

                            vendorSchema.update({ _id: data.body.vendorId }, {
                                $set: { licenceImage: detailsInfo, status: 'WAITING_FOR_APPROVAL' }
                            }, function (err, result) {
                                console.log(result);

                                //SAVE LOG
                                var logObj = {
                                    vendorId: data.body.vendorId,
                                    type: 'Restaurant CAC License Update',
                                    log: `Restaurant updated their CAC License`,
                                    addedTime: new Date()
                                }
                                saveVendorLog(logObj);

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Licence uploaded successfully.',
                                    response_data: {}
                                });

                            })

                        } else { //IF SOMEHOW LOGO UPLOAD FAILED
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Internal error, Something went wrong.',
                                response_data: {}
                            });
                        }
                    }
                }
            });


        }
    },
    //foodSafety Upload
    foodSafetyUpload: (data, callBack) => {
        if (data) {
            var files = data.files;
            vendorSchema.findOne({ _id: data.body.vendorId }, async function (err, result) {
                if (err) {
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (result) {
                        if (result.foodSafetyCertificate != '') {
                            var fs = require('fs');
                            var filePath = `public/img/vendor/${result.foodSafetyCertificate}`;
                            fs.unlink(filePath, (err) => { });
                        }

                        var detailsInfo = await uploadvendorImage(files.image, 'foodsafety');
                        console.log(detailsInfo);
                        if (detailsInfo != 'error') {

                            vendorSchema.update({ _id: data.body.vendorId }, {
                                $set: { foodSafetyCertificate: detailsInfo, status: 'WAITING_FOR_APPROVAL' }
                            }, function (err, result) {
                                console.log(result);

                                //SAVE LOG
                                var logObj = {
                                    vendorId: data.body.vendorId,
                                    type: 'Restaurant Food safety certificate Update',
                                    log: `Restaurant updated their Food safety certificate`,
                                    addedTime: new Date()
                                }
                                saveVendorLog(logObj);

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Food safety certificate uploaded successfully.',
                                    response_data: {}
                                });

                            })

                        } else { //IF SOMEHOW LOGO UPLOAD FAILED
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Internal error, Something went wrong.',
                                response_data: {}
                            });
                        }
                    }
                }
            });


        }
    },
    //Get Notification Settings
    getNotificationData: (data, callBack) => {
        if (data) {
            var reqBody = data.body;
            vendorOwnerSchema
                .findOne({ vendorId: reqBody.vendorId, _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {

                        userNotificationSettingSchema
                            .findOne({ userId: reqBody.vendorId })
                            .then(async (usernotSetting) => {

                                if (usernotSetting == null) {
                                    var usernotSettingData = { 'NewOrder': true, 'PreOrder': true, 'OrderNotification': true, 'OrderModification': true, 'OrderCancellation': true }
                                } else {
                                    var usernotSettingData = usernotSetting.notificationData;

                                }
                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'User Notification',
                                    response_data: { usernotSetting: usernotSettingData }
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            })




                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
    //Update Notification Settings
    updateNotificationData: (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var notificationData = reqBody.notificationData;

            if (typeof notificationData == 'string') {
                notificationDataObj = JSON.parse(notificationData);
            } else {
                notificationDataObj = notificationData;
            }
            vendorOwnerSchema
                .findOne({ vendorId: reqBody.vendorId, _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {

                        userNotificationSettingSchema
                            .findOne({ userId: reqBody.vendorId })
                            .then(async (usernotSetting) => {

                                if (usernotSetting == null) {
                                    var addNotificationData = {
                                        userId: reqBody.vendorId,
                                        userType: 'VENDOR',
                                        notificationData: notificationDataObj
                                    }

                                    new userNotificationSettingSchema(addNotificationData).save(async function (err, result) {
                                        if (err) {
                                            console.log(err);
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
                                                message: 'User updated successfully',
                                                response_data: {}
                                            });
                                        }
                                    });
                                } else {
                                    var updateNotificationData = {
                                        notificationData: notificationDataObj
                                    }

                                    userNotificationSettingSchema.update({ userId: reqBody.vendorId }, {
                                        $set: updateNotificationData
                                    }, function (err, result) {
                                        if (err) {
                                            console.log(err);
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });
                                        } else {
                                            if (result.nModified == 1) {
                                                callBack({
                                                    success: true,
                                                    STATUSCODE: 200,
                                                    message: 'User updated successfully',
                                                    response_data: {}
                                                });
                                            } else {
                                                callBack({
                                                    success: false,
                                                    STATUSCODE: 500,
                                                    message: 'Something went wrong.',
                                                    response_data: {}
                                                })
                                            }

                                        }
                                    });
                                }
                            })
                            .catch((err) => {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            })




                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
    // Notification List
    notificationList: (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            vendorOwnerSchema
                .findOne({ vendorId: reqBody.vendorId, _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {

                        UserNotificationSchema
                            .find({ userId: reqBody.vendorId })
                            .sort({ createdAt: -1 })
                            .then(async (usernotifications) => {



                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'userNotificatons',
                                    response_data: { notifications: usernotifications, badgeCount: res.badgeCount }
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            })




                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
    // Notification Delete
    notificationDelete: (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var notificationId = reqBody.notificationId;

            vendorOwnerSchema
                .findOne({ vendorId: reqBody.vendorId, _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {

                        UserNotificationSchema
                            .findOne({ userId: reqBody.vendorId, _id: notificationId })
                            .then(async (usernotifications) => {

                                if (usernotifications != null) {

                                    UserNotificationSchema.deleteOne({ _id: notificationId }, async function (err) {
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
                                                vendorId: data.body.vendorId,
                                                type: 'Restaurant Notification Delete',
                                                log: `Restaurant deleted a notification (${usernotifications.title})`,
                                                addedTime: new Date()
                                            }
                                            saveVendorLog(logObj);


                                            var checkUserNot = await UserNotificationSchema.countDocuments({ userId: reqBody.vendorId, isRead: 'NO' });

                                            var currentBadge = checkUserNot;

                                            var userResp = await vendorOwnerSchema.updateOne({ _id: reqBody.customerId }, {
                                                $set: {
                                                    badgeCount: currentBadge
                                                }
                                            });



                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'Notification deleted successfully.',
                                                response_data: {}
                                            });
                                        }

                                    });

                                } else {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'Notification not found',
                                        response_data: {}
                                    });
                                }




                            })
                            .catch((err) => {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            })




                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
    // Update Notification count
    updateBadgeCount: (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var notificationId = reqBody.notificationId;

            vendorOwnerSchema
                .findOne({ vendorId: reqBody.vendorId, _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {
                        UserNotificationSchema.findOne({ _id: notificationId })
                            .then(async (userNot) => {

                                if (userNot != null) {
                                    if (userNot.isRead == 'NO') {

                                        var notificationUp = await UserNotificationSchema.updateOne({ _id: notificationId }, {
                                            $set: {
                                                isRead: 'YES'
                                            }
                                        });


                                        var checkUserNot = await UserNotificationSchema.countDocuments({ userId: reqBody.vendorId, isRead: 'NO' });

                                        var currentBadge = checkUserNot;

                                        var userResp = await vendorOwnerSchema.updateOne({ _id: reqBody.customerId }, {
                                            $set: {
                                                badgeCount: currentBadge
                                            }
                                        });

                                        //SAVE LOG
                                        var logObj = {
                                            vendorId: data.body.vendorId,
                                            type: 'Restaurant Notification Read',
                                            log: `Restaurant read a notification (${userNot.title})`,
                                            addedTime: new Date()
                                        }
                                        saveVendorLog(logObj);

                                        callBack({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: 'Push count updated',
                                            response_data: {}
                                        });
                                    } else {
                                        callBack({
                                            success: true,
                                            STATUSCODE: 201,
                                            message: 'Push count updated',
                                            response_data: {}
                                        });
                                    }
                                }
                            });






                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
    // Get Vendor Content
    getVendorContent: (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            // var contentFaq = [
            //     {
            //         question: 'When do I receive payments',
            //         answer: ['Payments are made directly to the bank details you have provided on a 48 hours basis for all confirmed purchase done within Kabou SLA']
            //     },
            //     {
            //         question: 'Will I be charged shipping fee?',
            //         answer: ['Customers are responsible for charged shipping fee, but may work closely with vendors to offer Promos and Offers with the SLA ']
            //     },
            //     {
            //         question: 'How will I be paid?',
            //         answer: ['Payment will be transferred to your provided bank account for easy accessibility within 48 hours of confirmed purchase']
            //     },
            //     {
            //         question: 'I forgot my password',
            //         answer: [`Go to Sign in page.

            //                 Click on “Forgot your password?” link.,
            //                 Enter your email, an OTP Code will be sent to you as an extra security measure to protect you. Then you will be able to reset your password. `]
            //     },
            //     {
            //         question: 'How do I know how much is due to be transferred to me as a Vendor',
            //         answer: ['Kabou payment management can be done through the web and mobile application through the "Manage Payment" section, where you will be able to view "Pending Payments" in real-time']
            //     },
            //     {
            //         question: 'How do I Turn-Off my Restaurant availability on Kabou',
            //         answer: [`If your Restaurant service is temporary unavailable due to maintenance or other reasons, please follow the steps below to turn off your Restaurant availability to stop Orders from coming to you.

            //         1.Sign in and navigate to your account dashboard.
            //         2.Click on Manage Opening Time and you will see the Turn On/Off availability button.
            //         3.Select Turn Off and click on Update profile button (This will override your availability days and times, delivery and pickup requests for your Restaurant will be temporarily suspended until you have turned it back on).`]
            //     },
            //     {
            //         question: 'How do I Turn-On my Restaurant availabilIty on Kabou',
            //         answer: [`If your Restaurant service have been temporary unavailable due to maintenance or other reasons and you wish to turn availability back on, please follow the steps below to turn on your Restaurant availability to start selling again.

            //         1.Sign in and navigate to your account dashboard.
            //         2.Click on Manage Opening Time and you will see the Turn On/Off availability button.
            //         3.Select Turn on and click on Update profile button (Also, you may want to reschedule your Restaurant availability by changing the opening and closing time/ days).
            //         `]
            //     },
            //     {
            //         question: 'How do I Sign-up as a Vendor on Kabou',
            //         answer: [`To sign up as Vendor, follow the steps below.

            //         1.Download Kabou app or visit https://www. Eats.com.ng/
            //         2.Click on Register.
            //         3.Provide all the required information and you will be given access to set-up your Restaurant profile (e.g. Opening time, Menu listings, Menu Options, Menu extras etc.)
            //         4.Validations of provided information will be done by the Kabou team and upon successful completion, millions of Kabou customers will be able to see your Restaurant menu and make purchases
            //         `]
            //     },
            //     {
            //         question: 'How to Accept an Order',
            //         answer: [`
            //         1.When you get an Order request, you will receive a New Order notification.
            //         2.You will need to either Accept the Order or Request Modification or Cancellation with Reasons.
            //         3.After Orders have been accepted, a notification will be sent to the Customer with an Estimated Preparation Time you have entered.
            //         `]
            //     },
            //     {
            //         question: 'Can I Cancel an Order',
            //         answer: [`
            //         1.When you get an Order request, you will receive a New Order notification.
            //         2.You will need to either Accept the Order or Request Modification or Cancellation with Reasons.
            //         3.Should you decide to cancel the order, you can click on the cancel with reason and a cancellation request will be sent to the Customer with reasons for cancellation
            //         `]
            //     },
            //     {
            //         question: 'An Order that I was prepping was just cancelled',
            //         answer: [`Customers can Cancel an Order within 2 minutes of placing the Order, this is to allow modification where applicable within a reasonable time frame.
            //         `]
            //     },
            //     {
            //         question: 'Marking a listed menu out of stock',
            //         answer: [`To mark a menu out of stock, Click on the menu information PAGE and turn the menu off and when the menu is finish and turn it on when it becomes available again.
            //         `]
            //     },
            //     {
            //         question: 'What if I cannot fulfil an Order',
            //         answer: [`
            //         1.When you get an Order request you cannot fulfil, you can cancel this order but must be with an acceptable reason.
            //         2.Should you decide to cancel the order, you can click on the cancel with reason and a cancellation request will be sent to the Customer with reasons for cancellation
            //         `]
            //     },
            //     {
            //         question: 'How do I update my bank account information?',
            //         answer: [`
            //         1.Kindly click on your profile
            //         2.Click on the Management Payments
            //         3.Edit on the account information and update the bank account details 
            //         `]
            //     },
            // ]

            // console.log(contentFaq);


            // var contentObj = {
            //     pageName: 'VendorWhoWeAre',
            //     content: whoWeAre
            // }

            // new contentSchema(contentObj).save(async function (err, result) {
            //     if (err) {
            //         console.log(err);
            //         callBack({
            //             success: false,
            //             STATUSCODE: 500,
            //             message: 'Internal DB error',
            //             response_data: {}
            //         });
            //     } else {
            //         console.log(result);
            //     }
            // });

            vendorOwnerSchema
                .findOne({ vendorId: reqBody.vendorId, _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {

                        if (reqBody.pageName == 'VendorFaq') {
                            faqSchema.find({ userType: 'VENDOR' }, { question: 1, answer: 1 })
                                .then(async (faq) => {

                                    var contentFaq = {
                                        _id: '',
                                        pageName: 'VendorFaq',
                                        isActive: true,
                                        content: faq
                                    }
                                    callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: `VendorFaq Content`,
                                        response_data: { content: contentFaq }
                                    });
                                })
                                .catch((err) => {
                                    console.log(err);
                                    callBack({
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error',
                                        response_data: {}
                                    });
                                })

                        } else {

                            contentSchema
                                .findOne({ pageName: reqBody.pageName })
                                .then(async (content) => {
                                    callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: `${reqBody.pageName} Content`,
                                        response_data: { content: content }
                                    });
                                })
                                .catch((err) => {
                                    console.log(err);
                                    callBack({
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error',
                                        response_data: {}
                                    });
                                })


                        }



                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
}

//Vendor Related Image uplaod
function uploadvendorImage(file, name) {
    return new Promise(function (resolve, reject) {
        console.log(file.name);
        //Get image extension
        var ext = getExtension(file.name);

        // The name of the input field (i.e. "image") is used to retrieve the uploaded file
        let sampleFile = file;

        var file_name = `${name}-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

        // Use the mv() method to place the file somewhere on your server
        sampleFile.mv(`public/img/vendor/${file_name}`, function (err) {
            if (err) {
                console.log('err', err);
                return reject('error');
            } else {
                return resolve(file_name);
            }
        });
    });
}
//Vendor Related Image uplaod
function addRestaurantDayTimes(data) {
    return new Promise(function (resolve, reject) {
        // addVendorTime: async (data, callBack) => {
            if (data) {

                var reqBody = data.body;
    
                var validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                var validZone = ['AM', 'PM'];
                var validDaysCurr = [];
                console.log(reqBody);
                var restaurantTime = reqBody.restaurantTime;
    
                if (typeof restaurantTime == 'string') {
                    var restaurantTimeObj = JSON.parse(restaurantTime);
                } else {
                    var restaurantTimeObj = restaurantTime;
                }
    
    
    
                //CHECK if Restaurant Time data is valid Json or not
                var checkJson = true;
    
    
                if (checkJson == true) {
    
                    if ((restaurantTimeObj.length > 0) && (restaurantTimeObj.length <= 7)) {
                        var validateData = 0;
                        var restaurantTimeValArr = [];
                        for (let restaurantTimeVal of restaurantTimeObj) { //{ day: 'Monday', startTime: '10 AM', endTime: '10:30 PM' }
                            var restaurantTimeValdays = restaurantTimeVal.day; //Monday
                            var restaurantTimeValStartTime = restaurantTimeVal.startTime; //10 AM
                            var restaurantTimeValEndTime = restaurantTimeVal.endTime; //10:30 PM
    
                            if (validDays.includes(restaurantTimeValdays)) { //CHECK IF DAY IS VALID OR NOT
                                if (validDaysCurr.includes(restaurantTimeValdays)) {
                                    continue;
                                } else {
                                    var restaurantTimeValStartTimeCheck = restaurantTimeValStartTime.split(" "); //[ '10', 'AM' ]
                                    var restaurantTimeValEndTimeCheck = restaurantTimeValEndTime.split(" "); //[ '10:30', 'PM' ]
    
                                    if ((restaurantTimeValStartTimeCheck.length == 2) && (restaurantTimeValEndTimeCheck.length == 2)) { //THIS RESULT ALWAYS HAVE TO RETURN 2
                                        if ((validZone.includes(restaurantTimeValStartTimeCheck[1])) && (validZone.includes(restaurantTimeValEndTimeCheck[1]))) { //CHECK AM,PM STRING
                                            var restaurantTimeStartTimeFormatCheck = restaurantTimeValStartTimeCheck[0].split(":"); // [ '10' ]
                                            var restaurantTimeEndTimeFormatCheck = restaurantTimeValEndTimeCheck[0].split(":"); // [ '10','30' ]
    
                                            if ((!isNaN(restaurantTimeStartTimeFormatCheck[0])) && (!isNaN(restaurantTimeEndTimeFormatCheck[0]))) { //THIS VALUE MUST BE A NUMBER
    
                                                var restaurantTimeStartTimeLast = 0;
                                                if (restaurantTimeStartTimeFormatCheck[1] != undefined) {
                                                    restaurantTimeStartTimeLast = restaurantTimeStartTimeFormatCheck[1];
                                                }
    
                                                var restaurantTimelastTimeLast = 0;
                                                if (restaurantTimeEndTimeFormatCheck[1] != undefined) {
                                                    restaurantTimelastTimeLast = restaurantTimeEndTimeFormatCheck[1];
                                                }
    
                                                if ((!isNaN(restaurantTimeStartTimeLast)) && (!isNaN(restaurantTimelastTimeLast))) { //THIS VALUE MUST BE A NUMBER
                                                    var startTimeAMPM = restaurantTimeValStartTimeCheck[1];
                                                    var endTimeAMPM = restaurantTimeValEndTimeCheck[1];
    
                                                    var startTimeFirst = Number(restaurantTimeStartTimeFormatCheck[0]);
                                                    var endTimeFirst = Number(restaurantTimeEndTimeFormatCheck[0]);
    
                                                    var startTimeLast = Number(restaurantTimeStartTimeLast);
                                                    var endTimeLast = Number(restaurantTimelastTimeLast);
    
                                                    //OPEN TIME
                                                    if (startTimeAMPM == 'AM') {
                                                        var finalStartTime = ((startTimeFirst * 60) + startTimeLast);
                                                    } else {
                                                        var finalStartTime = (((startTimeFirst + 12) * 60) + startTimeLast);
                                                    }
    
                                                    //CLOSE TIME
                                                    if (endTimeAMPM == 'AM') {
                                                        var finalEndTime = ((endTimeFirst * 60) + endTimeLast);
                                                    } else {
                                                        var finalEndTime = (((endTimeFirst + 12) * 60) + endTimeLast);
                                                    }
    
                                                    var vendorTimeData = {
                                                        vendorId: reqBody.vendorId,
                                                        day: restaurantTimeValdays,
                                                        openTime: finalStartTime,
                                                        closeTime: finalEndTime,
                                                        isActive: true
                                                    }
    
                                                    restaurantTimeValArr.push(vendorTimeData);
    
                                                } else {
                                                    console.log('Start & End Time Format Invalid after :');
                                                    validateData++;
                                                }
    
                                            } else {
                                                console.log('Start & End Time Format Invalid');
                                                validateData++;
                                            }
    
                                        } else {
                                            console.log('Start & End Time AM, PM Invalid');
                                            validateData++;
                                        }
                                    } else {
                                        console.log('Start & End Time Format Invalid');
                                        validateData++;
                                    }
                                }
    
                            } else {
                                console.log('DAY value Invalid');
                                validateData++;
                            }
                        }
    
    
    
                        if (validateData == 0) { //NO ERROR IN RESTAURANT TIME JSON FORMAT
                            // console.log('validateData', validateData);
                            // console.log(restaurantTimeValArr);
    
                            var updateVendor = {}
    
    
                                var vendorTimeArray = [];
    
                                vandorTimeSchema.insertMany(restaurantTimeValArr, function (err, result) {
                                    if (err) {
                                        console.log(err);
                                        return reject({
                                            success: false,
                                            STATUSCODE: 500,
                                            message: 'Internal DB error',
                                            response_data: {}
                                        });
                                    } else {
                                        if (result) {
                                            for (let resultVal of result) {
                                                vendorTimeArray.push(resultVal._id);
                                            }
                                            updateVendor.vendorOpenCloseTime = vendorTimeArray;
                                            updateVendor.restaurantClose = false;

                                            return resolve({
                                                updateVendor: updateVendor
                                            });
                                        }
    
                    
                                    }
    
                                });
                     
                        } else {
                            return reject({
                                success: false,
                                STATUSCODE: 422,
                                message: 'Invalid Restaurant time format.',
                                response_data: {}
                            });
                        }
                        // console.log(validateData);
                    } else {
                        return reject({
                            success: false,
                            STATUSCODE: 422,
                            message: 'Restaurant time required.',
                            response_data: {}
                        });
                    }
    
                } else {
                    return reject({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Invalid Restaurant time format.',
                        response_data: {}
                    });
                }
    
                // console.log(JSON.parse(reqBody.restaurantTime));
    
            }
        
    });
}

function getExtension(filename) {
    return filename.substring(filename.indexOf('.') + 1);
}

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
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

function createDateFormat(reqDate) {
    var date = reqDate;

    var monthsTOneArr = [1, 3, 5, 7, 8, 10, 12];

    var dateSpl = date.split("/");

    var month = dateSpl[1];
    var day = dateSpl[0];
    var year = dateSpl[2];


    var dateNew = new Date(`${month}-${day}-${year} 00:00:00`);
    console.log(day);
    console.log(dateNew);

    return dateNew;

}

function listDateFormat(date) {
    var dateFormatCheck = date;

    var day = dateFormatCheck.getDate();

    var month = (Number(dateFormatCheck.getMonth()) + 1);

    if (Number(month) < 10) {
        month = `0${month}`
    }

    var year = dateFormatCheck.getFullYear();

    var dateformat = `${year}/${month}/${day}`;

    return dateformat;
}

function listGetDateFormat(date) {
    var dateFormatCheck = date;

    if ((dateFormatCheck == '') || (dateFormatCheck == null)) {
        return '';
    } else {
        console.log('dateFormatCheck', dateFormatCheck);
        var day = dateFormatCheck.getDate();

        var month = (Number(dateFormatCheck.getMonth()) + 1);

        if (Number(month) < 10) {
            month = `0${month}`
        }

        var year = dateFormatCheck.getFullYear();

        var dateformat = `${day}/${month}/${year}`;

        return dateformat;
    }


}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function sendVerificationCode(customer) {
    return new Promise(async function (resolve, reject) {

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

    });

}

function generateToken(userData) {
    let payload = { subject: userData._id, user: 'CUSTOMER' };
    return jwt.sign(payload, config.secretKey, { expiresIn: '3600000h' })
}

function saveVendorLog(logObj) {

    new vendorlogSchema(logObj).save(async function (err, result) {
        if (err) {
            console.log(err);

        } else {
            console.log('Log Saved');
        }

        await vendorSchema.updateOne({ _id: logObj.vendorId }, {
            $set: {
                lastModified: new Date()
            }
        });
    });
}

