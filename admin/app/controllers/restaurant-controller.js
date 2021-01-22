const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const mail = require('../../modules/sendEmail');
const { SERVERURL, HOST, PORT, SERVERIMAGEPATH, SERVERIMAGEUPLOADPATH, GOOGLE_API_KEY } = require('../../config/bootstrap');
//Session
var session = require('express-session');

var vendorSchema = require('../../schema/Vendor');
var vendorAccountSchema = require('../../schema/VendorAccount');
var vendorCategorySchema = require('../../schema/VendorCategory');
var mappingVendorCategoriesSchema = require('../../schema/MappingVendorCategory');
var itemSchema = require('../../schema/Item');
var ItemExtraSchema = require('../../schema/ItemExtra');
var categorySchema = require('../../schema/Category');
var vandorTimeSchema = require('../../schema/VendorOpenCloseTime');
var bankAccountSchema = require('../../schema/BankAccount');
var vendorPaymentSettingSchema = require('../../schema/VendorPaymentSetting');
var vendorOwnerSchema = require('../../schema/VendorOwner');
var userDeviceLoginSchemaSchema = require('../../schema/UserDeviceLogin');
var UserNotificationSchema = require('../../schema/UserNotification');
var PushLib = require('../../libraries/pushlib/send-push');
var vendorlogSchema = require('../../schema/VendorLog');
var ItemOptionSchema = require('../../schema/ItemOption');
var moment = require('moment');


module.exports.list = (req, res) => {

    var user = req.session.user;
    var vendorFilter = req.query.filter;


    var vendorCond = {
        isDisabled: { $ne: true }
    };
    var vendorCondtxt = '';
    var vendorCondFrom = '';
    var vendorCondTo = '';
    if (vendorFilter != undefined) {
        if (vendorFilter == 'active') {
            vendorCondtxt = 'active'
            vendorCond.isActive = true;
        } else if (vendorFilter == 'inactive') {
            vendorCondtxt = 'inactive'
            vendorCond.isActive = false;
        } else if (vendorFilter == 'all') {
            vendorCondtxt = 'all'
        } else if (vendorFilter == 'duration') {
            vendorCondtxt = 'duration'
            var fromDate = req.query.from;
            var toDate = req.query.to;

            vendorCondFrom = fromDate;
            vendorCondTo = toDate;


            var validityFrom = createDateFormat(fromDate)
            var validityTo = createDateFormat(toDate)

            vendorCond.createdAt = { $gte: validityFrom, $lte: validityTo }


        }

    }

    var vendorId = req.query.id;

    if (vendorId != undefined) {
        vendorCondtxt = 'id'
        vendorCond._id = vendorId;
    }

    vendorSchema.find(vendorCond)
        .sort({ createdAt: -1 })
        .then(async (vendors) => {

            var imagePath = `${SERVERIMAGEPATH}vendor/`

            res.render('restaurant/list.ejs', {
                vendors: vendors, serverImagePath: imagePath, vendorCondtxt: vendorCondtxt,
                layout: false,
                user: user,
                moment: moment,
                vendorCondFrom: vendorCondFrom,
                vendorCondTo: vendorCondTo
            });
        });
}

module.exports.fetchBankAccount = (req, res) => {

    var vendorId = req.body.vendorId;

    // console.log(vendorId);

    vendorAccountSchema
        .findOne({ vendorId: vendorId, isCurrent: true })
        .then(async (vendorAccount) => {

            if (vendorAccount != null) {
                var bankAccount = {
                    _id: vendorAccount._id,
                    accountNo: vendorAccount.accountNo,
                    businessName: vendorAccount.businessName,
                    accountName: vendorAccount.accountName,
                    isActive: vendorAccount.isActive
                }

                bankAccount.vendorPayment = await vendorPaymentSettingSchema.findOne({ vendorId: vendorId });
            } else {
                var bankAccount = null
            }

            console.log('bankAccount', bankAccount);


            var responseObj = {
                msg: 'Fetched successfully.',
                body: bankAccount
            };
            res.status(200).json(responseObj)
        })
        .catch((error) => {
            console.log('error', error);

            var responseObj = { msg: 'Something went wrong.' };

            res.status(500).json(responseObj)

        })

}

module.exports.updateBankStatus = (req, res) => {

    var accountId = req.body.accountId;


    vendorAccountSchema
        .findOne({ _id: accountId })
        .then((vendorAccount) => {

            if (vendorAccount.isActive == true) {
                var updateStatus = {
                    isActive: false
                }
            } else {
                var updateStatus = {
                    isActive: true,
                    businessName: vendorAccount.accountName
                }
            }



            vendorAccountSchema.updateOne({ _id: accountId }, {
                $set: updateStatus
            }, function (err, resp) {
                if (err) {
                    console.log('err', err);
                    var responseObj = { msg: 'Something went wrong.' };
                    res.status(500).json(responseObj)
                } else {
                    if (resp.nModified == 1) {

                        //SAVE LOG
                        var logObj = {
                            vendorId: vendorAccount.vendorId,
                            type: 'Restaurant Bank Account Status Change',
                            log: `Admin changed the bank account status`,
                            addedTime: new Date()
                        }
                        saveVendorLog(logObj);

                        var responseObj = {
                            msg: 'Status changed successfully.',
                            body: updateStatus
                        };
                        res.status(200).json(responseObj)
                    } else {
                        console.log('err', err);
                        var responseObj = { msg: 'Something went wrong.' };
                        res.status(500).json(responseObj)
                    }
                }

            });



        })
        .catch((error) => {
            console.log('error', error);

            var responseObj = { msg: 'Something went wrong.' };

            res.status(500).json(responseObj)

        })

}

module.exports.getLogHistory = (req, res) => {

    var vendorId = req.body.vendorId;

    // console.log(vendorId);

    vendorlogSchema
        .find({ vendorId: vendorId })
        .sort({ addedTime: 'desc' })
        .then(async (vendorlog) => {
            console.log(vendorlog);

            res.render('restaurant/ajaxLogHistory.ejs', {
                vendorlog: vendorlog,
                layout: false,
                moment: moment
            });
        })


}

module.exports.getBankHistory = (req, res) => {

    var vendorId = req.body.vendorId;

    vendorAccountSchema.find({ vendorId: vendorId, isCurrent: false })
        .sort({ createdAt: -1 })
        .then(async (vendorBankAccounts) => {


            res.render('restaurant/ajaxBankHistory.ejs', {
                vendorBankAccounts: vendorBankAccounts,
                layout: false,
                moment: moment
            });

        })


}


module.exports.deleteBank = (req, res) => {

    var id = req.query.id;
    if (id != undefined) {

        bankAccountSchema
            .findOne({ _id: id })
            .then(async (bankGet) => {

                if (bankGet != null) {

                    bankAccountSchema.deleteOne({ _id: id }, function (err) {
                        if (err) {
                            req.flash('msgLog', 'Something went wrong.');
                            req.flash('msgType', 'danger');
                            res.redirect(req.headers.referer);
                            return;
                        } else {

                            req.flash('msgLog', 'Bank deleted successfully.');
                            req.flash('msgType', 'success');
                            res.redirect(req.headers.referer);
                            return;

                        }
                    });
                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }

            });
    }
}

module.exports.changeStatus = (req, res) => {

    var vendorId = req.query.id;
    var vendorStatus = req.query.status;
    if (vendorId != undefined) {

        if (vendorStatus == 'Active') {
            var isActive = false
        } else {
            var isActive = true
        }


        vendorSchema.updateOne({ _id: vendorId }, {
            $set: {
                isActive: isActive
            }
        }, function (err, resp) {
            if (err) {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            } else {
                if (resp.nModified == 1) {

                    //SAVE LOG
                    var logObj = {
                        vendorId: vendorId,
                        type: 'Restaurant Status Change',
                        log: `Admin changed the restaurant status`,
                        addedTime: new Date()
                    }
                    saveVendorLog(logObj);

                    req.flash('msgLog', 'Status updated successfully.');
                    req.flash('msgType', 'success');
                    res.redirect(req.headers.referer);
                    return;
                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }
            }
        });

    }
}

module.exports.vendorActiveChange = (req, res) => {





    var vendorId = req.body.vendorIds;
    var activeTime = req.body.activeTime;
    var activationNote = req.body.addNote;

    var activeTimeRes = activeTime.split("-");

    var fromTimeRes = (activeTimeRes[0]).trim();
    var toTimeRes = (activeTimeRes[1]).trim();

    var fromTime = createDateFormat(fromTimeRes);
    var toTime = createDateFormatEnd(toTimeRes);


    if (vendorId != undefined) {


        vendorSchema.updateOne({ _id: vendorId }, {
            $set: {
                isActive: true,
                activationFromDate: fromTime,
                activationToDate: toTime,
                activationNote: activationNote
            }
        }, function (err, resp) {
            if (err) {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            } else {
                if (resp.nModified == 1) {

                    //SAVE LOG
                    var logObj = {
                        vendorId: vendorId,
                        type: 'Restaurant Status Change',
                        log: `Admin changed the restaurant status`,
                        addedTime: new Date()
                    }
                    saveVendorLog(logObj);

                    req.flash('msgLog', 'Status updated successfully.');
                    req.flash('msgType', 'success');
                    res.redirect(req.headers.referer);
                    return;
                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }
            }
        });

    }
}

module.exports.disableRestaurant = (req, res) => {

    var vendorId = req.query.restaurant;

    var vendorDisable = req.query.type;


    if (vendorId != undefined) {

        if (vendorDisable == 'enable') {
            var isDisable = false
            var msg = 'Restaurant enabled successfully.'
        } else {
            var isDisable = true
            var msg = 'Restaurant disabled successfully.'
        }


        vendorSchema.updateOne({ _id: vendorId }, {
            $set: {
                isDisabled: isDisable
            }
        }, function (err, resp) {
            if (err) {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            } else {
                if (resp.nModified == 1) {
                    req.flash('msgLog', msg);
                    req.flash('msgType', 'success');
                    res.redirect(req.headers.referer);
                    return;
                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }
            }
        });

    }
}

module.exports.disableList = (req, res) => {

    var user = req.session.user;



    var vendorCond = {
        isDisabled: true
    };

    vendorSchema.find(vendorCond)
        .sort({ createdAt: -1 })
        .then(async (vendors) => {

            var imagePath = `${SERVERIMAGEPATH}vendor/`

            res.render('restaurant/disableList.ejs', {
                vendors: vendors, serverImagePath: imagePath, vendorCondtxt: '',
                layout: false,
                user: user
            });
        });
}

module.exports.deleteImage = (req, res) => {

    var vendorId = req.query.id;

    var type = req.query.type;

    var fs = require('fs');
    var updateVendor = {};


    if (vendorId != undefined) {

        vendorSchema
            .findOne({ _id: vendorId })
            .exec(async function (err, results) {
                console.log('err', err);
                if (results != null) {

                    if (type == 'banner') {

                        var filePath = `${SERVERIMAGEUPLOADPATH}vendor/${results.banner}`;
                        fs.unlink(filePath, (err) => { });

                        updateVendor.banner = '';

                    } else if (type == 'logo') {

                        var filePath = `${SERVERIMAGEUPLOADPATH}vendor/${results.logo}`;
                        fs.unlink(filePath, (err) => { });

                        updateVendor.logo = '';

                    } else if (type == 'food') {

                        var filePath = `${SERVERIMAGEUPLOADPATH}vendor/${results.foodSafetyCertificate}`;
                        fs.unlink(filePath, (err) => { });

                        updateVendor.foodSafetyCertificate = '';
                        updateVendor.status = 'PENDING_FOR_LICENSE';
                        updateVendor.isActive = false;

                    } else if (type == 'cac') {

                        var filePath = `${SERVERIMAGEUPLOADPATH}vendor/${results.licenceImage}`;
                        fs.unlink(filePath, (err) => { });

                        updateVendor.licenceImage = '';
                        updateVendor.status = 'PENDING_FOR_LICENSE';
                        updateVendor.isActive = false;

                    }


                    vendorSchema.updateOne({ _id: vendorId }, {
                        $set: updateVendor
                    }, function (err, resp) {
                        if (err) {
                            req.flash('msgLog', 'Something went wrong.');
                            req.flash('msgType', 'danger');
                            res.redirect(req.headers.referer);
                            return;
                        } else {
                            if (resp.nModified == 1) {
                                req.flash('msgLog', 'Image deleted successfully');
                                req.flash('msgType', 'success');
                                res.redirect(req.headers.referer);
                                return;
                            } else {
                                req.flash('msgLog', 'Something went wrong.');
                                req.flash('msgType', 'danger');
                                res.redirect(req.headers.referer);
                                return;
                            }
                        }
                    });
                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }
            });



    }
}

module.exports.edit = (req, res) => {

    var user = req.session.user;

    var vendorId = req.query.id;
    var responseDt = {};

    if (vendorId != undefined) {

        vendorSchema
            .findOne({ _id: vendorId })
            .populate('vendorOpenCloseTime')
            .exec(async function (err, results) {

                console.log('err', err);


                if (results != null) {
                    var restaurantInfo = {
                        name: results.restaurantName,
                        managerName: results.managerName,
                        restaurantType: results.restaurantType,
                        description: results.description,
                        contactEmail: results.contactEmail,
                        countryCode: results.countryCode,
                        contactPhone: results.contactPhone,
                        rating: parseFloat((results.rating).toFixed(1)),
                        logo: `${results.logo}`,
                        banner: `${results.banner}`,
                        licenceImage: `${results.licenceImage}`,
                        foodSafetyCertificate: `${results.foodSafetyCertificate}`,
                        restaurantClose: results.restaurantClose,
                        address: results.address,
                        location: results.location,
                        delivery: results.delivery

                    };

                    var restaurantTypeArr = restaurantInfo.restaurantType.split(",");

                    //  console.log(restaurantTypeArr);

                    //Calculate Distance
                    var sourceLat = results.location.coordinates[1];
                    var sourceLong = results.location.coordinates[0];

                    restaurantInfo.latitude = sourceLat;
                    restaurantInfo.longitude = sourceLong;


                    restaurantInfo.distance = ''

                    //Open time
                    var vendorTimeArr = [];
                    var openTimeArr = [];
                    var closeTimeArr = [];
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

                            if (Number(openrhours) < 10) {
                                openrhours = `0${openrhours}`
                            }

                            if (Number(openrminutes) < 10) {
                                openrminutes = `0${openrminutes}`
                            }

                            openTimeHours = openrhours;
                            openTimeMin = openrminutes;

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

                            if (Number(closerhours) < 10) {
                                closerhours = `0${closerhours}`
                            }

                            if (Number(closerminutes) < 10) {
                                closerminutes = `0${closerminutes}`
                            }

                            closeTimeHours = closerhours;
                            closeTimeMin = closerminutes;

                            vendorTimeObj.day = vendorTime.day;
                            vendorTimeObj.openTime = `${openTimeHours}:${openTimeMin} ${openTimeAMPM}`
                            vendorTimeObj.closeTime = `${closeTimeHours}:${closeTimeMin} ${closeTimeAMPM}`

                            vendorTimeArr.push(vendorTimeObj);
                        }
                    }

                    responseDt.restaurant = restaurantInfo;


                    console.log(responseDt);

                    var vendorCategory = await vendorCategorySchema.find({ isActive: true });

                    var imagePath = `${SERVERIMAGEPATH}`

                    var googleApiKey = `${GOOGLE_API_KEY}`

                    res.render('restaurant/edit.ejs', {
                        responseDt: responseDt, serverImagePath: imagePath, vendorCategory: vendorCategory, restaurantTypeArr: restaurantTypeArr, vendorTimeArr: vendorTimeArr, vendorId: vendorId, googleApiKey: googleApiKey, layout: false,
                        user: user
                    });

                    //  console.log(responseDt);


                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }

            });

    }
}

module.exports.editPost = (req, res) => {

    var files = req.files;
    var reqBody = req.body;

    // console.log('reqBody',reqBody);

    // return;


    var vendorId = reqBody.vendorId;

    if (vendorId != undefined) {

        vendorSchema
            .findOne({ _id: vendorId })
            .populate('vendorOpenCloseTime')
            .exec(async function (err, results) {
                console.log('err', err);
                if (results != null) {

                    if (!Array.isArray(reqBody.restaurantType)) {
                        var restaurantType = reqBody.restaurantType
                    } else {
                        var restaurantType = reqBody.restaurantType.join()

                    }

                    console.log('restaurantType', restaurantType);





                    if (reqBody.delivery == 'on') {
                        var restaurantdelivery = true;
                    } else {
                        var restaurantdelivery = false;
                    }

                    var updateVendor = {
                        restaurantName: reqBody.restaurantName,
                        managerName: reqBody.managerName,
                        restaurantType: restaurantType,
                        contactEmail: reqBody.contactEmail,
                        contactPhone: reqBody.contactPhone,
                        delivery: restaurantdelivery
                    }

                    updateVendor.address = reqBody.address,
                        updateVendor.location = {
                            type: 'Point',
                            coordinates: [reqBody.longitude, reqBody.latitude]
                        }

                    //Logo Unlink
                    if (files != null) {

                        if (files.logo != undefined) {
                            var fs = require('fs');
                            var filePath = `${SERVERIMAGEUPLOADPATH}vendor/${results.logo}`;
                            fs.unlink(filePath, (err) => { });

                            var logoImage = await uploadImage(files.logo, 'logo');

                            if (logoImage != 'error') {
                                updateVendor.logo = logoImage;
                            }
                        }

                        //Banner Unlink

                        if (files.banner != undefined) {
                            var fs = require('fs');
                            var filePath = `${SERVERIMAGEUPLOADPATH}vendor/${results.banner}`;
                            fs.unlink(filePath, (err) => { });

                            var bannerImage = await uploadImage(files.banner, 'banner');

                            if (bannerImage != 'error') {
                                updateVendor.banner = bannerImage;
                            }
                        }

                        //licence Image Unlink
                        if (files.licenceImage != undefined) {
                            var fs = require('fs');
                            var filePath = `${SERVERIMAGEUPLOADPATH}vendor/${results.licenceImage}`;
                            fs.unlink(filePath, (err) => { });

                            var licenceImage = await uploadImage(files.licenceImage, 'licence');

                            if (licenceImage != 'error') {
                                updateVendor.licenceImage = licenceImage;
                            }
                        }

                        //Food safety Image Unlink
                        if (files.foodSafetyCertificate != undefined) {
                            var fs = require('fs');
                            var filePath = `${SERVERIMAGEUPLOADPATH}vendor/${results.foodSafetyCertificate}`;
                            fs.unlink(filePath, (err) => { });

                            var foodSafetyCertificate = await uploadImage(files.foodSafetyCertificate, 'foodsafety');

                            if (foodSafetyCertificate != 'error') {
                                updateVendor.foodSafetyCertificate = foodSafetyCertificate;
                            }
                        }

                    }

                    // console.log('updateVendor', updateVendor);
                    // return;

                    var vendorTimeResp = await updateVendorTime(reqBody);

                    if (vendorTimeResp == 'success') {
                        vendorSchema.update({ _id: reqBody.vendorId }, {
                            $set: updateVendor
                        }, async function (err, resps) {
                            if (err) {
                                console.log('err', err);
                                req.flash('msgLog', 'Something went wrong.');
                                req.flash('msgType', 'danger');
                                res.redirect(req.headers.referer);
                                return;
                            } else {
                                if (resps.nModified == 1) {
                                    //Map Categories

                                    var vendorCategoriesArr = restaurantType.split(",");
                                    // var vendorCategoriesArr = reqBody.restaurantType;
                                    var mapVendorCatArr = [];
                                    if (vendorCategoriesArr.length > 0) {
                                        for (let vendorCategory of vendorCategoriesArr) {
                                            var mapVendorCatObj = {};
                                            var vendorCatCheck = await vendorCategorySchema.findOne({ categoryName: vendorCategory });

                                            console.log('vendorCatCheck', vendorCatCheck);
                                            if (vendorCatCheck != null) {
                                                mapVendorCatObj.vendorId = reqBody.vendorId
                                                mapVendorCatObj.vendorCategoryId = vendorCatCheck._id;

                                                mapVendorCatArr.push(mapVendorCatObj);
                                            }


                                        }
                                    }

                                    await mappingVendorCategoriesSchema.deleteMany({ vendorId: reqBody.vendorId });

                                    mappingVendorCategoriesSchema.insertMany(mapVendorCatArr, async function (err, mapresult) {
                                        if (err) {
                                            console.log('err', err);
                                            req.flash('msgLog', 'Something went wrong.');
                                            req.flash('msgType', 'danger');
                                            res.redirect(req.headers.referer);
                                            return;
                                        } else {

                                            req.flash('msgLog', 'Restaurant data updated succsessfully.');
                                            req.flash('msgType', 'success');
                                            res.redirect('/restaurant/vendorList');
                                            return;

                                        }
                                    });
                                } else {
                                    req.flash('msgLog', 'Something went wrong.');
                                    req.flash('msgType', 'danger');
                                    res.redirect(req.headers.referer);
                                    return;
                                }


                            }
                        });
                    } else {
                        req.flash('msgLog', vendorTimeResp);
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    }






                }
            })

    }
}

module.exports.bankAccountList = (req, res) => {
    var user = req.session.user;

    var vendorisActive = req.query.filter;

    var vendorCond = { isCurrent: true };


    var vendorCondtxt = '';
    vendorCondtxt = vendorisActive;
    if (vendorisActive == 'active') {

        vendorCond.isActive = true;

        vendorAccountSchema.find(vendorCond)
            .sort({ createdAt: -1 })
            .then(async (vendorBankAccounts) => {

                var vendorBankArr = [];
                if (vendorBankAccounts.length > 0) {
                    for (let vendorBankAccount of vendorBankAccounts) {
                        var bankAccount = {
                            _id: vendorBankAccount._id,
                            accountNo: vendorBankAccount.accountNo,
                            businessName: vendorBankAccount.businessName,
                            accountName: vendorBankAccount.accountName,
                            isActive: vendorBankAccount.isActive
                        }
                        bankAccount.vendor = await vendorSchema.findOne({ _id: vendorBankAccount.vendorId });
                        bankAccount.bankInfo = await bankAccountSchema.findOne({ bankCode: vendorBankAccount.bankCode });
                        bankAccount.vendorPayment = await vendorPaymentSettingSchema.findOne({ vendorId: vendorBankAccount.vendorId });

                        vendorBankArr.push(bankAccount);
                    }
                }

                res.render('restaurant/bankAccountList.ejs', {
                    vendorBankArr: vendorBankArr,
                    layout: false,
                    user: user,
                    vendorCondtxt: vendorCondtxt,
                    moment: moment
                });
            });

    } else if (vendorisActive == 'inactive') {
        vendorCond.isActive = false;

        vendorAccountSchema.find(vendorCond)
            .sort({ createdAt: -1 })
            .then(async (vendorBankAccounts) => {

                var vendorBankArr = [];
                if (vendorBankAccounts.length > 0) {
                    for (let vendorBankAccount of vendorBankAccounts) {
                        var bankAccount = {
                            _id: vendorBankAccount._id,
                            accountNo: vendorBankAccount.accountNo,
                            businessName: vendorBankAccount.businessName,
                            accountName: vendorBankAccount.accountName,
                            isActive: vendorBankAccount.isActive
                        }
                        bankAccount.vendor = await vendorSchema.findOne({ _id: vendorBankAccount.vendorId });
                        bankAccount.bankInfo = await bankAccountSchema.findOne({ bankCode: vendorBankAccount.bankCode });
                        bankAccount.vendorPayment = await vendorPaymentSettingSchema.findOne({ vendorId: vendorBankAccount.vendorId });

                        vendorBankArr.push(bankAccount);
                    }
                }

                console.log(vendorBankArr);
                // return;


                res.render('restaurant/bankAccountList.ejs', {
                    vendorBankArr: vendorBankArr,
                    layout: false,
                    user: user,
                    vendorCondtxt: vendorCondtxt,
                    moment: moment
                });
            });


    } else if (vendorisActive == 'nobankrecorded') {
        vendorSchema.find({ isDisabled: { $ne: true } })
            .sort({ createdAt: -1 })
            .then(async (vendors) => {
                var vendorBankArr = [];
                if (vendors.length > 0) {
                    for (let vendor of vendors) {
                        var vendorBankAccount = await vendorAccountSchema.findOne({ vendorId: vendor._id, isCurrent: true });

                        if (vendorBankAccount == null) {
                            var bankAccount = {
                                _id: '',
                                accountNo: '',
                                businessName: '',
                                accountName: '',
                                isActive: 'null',
                                vendor: vendor,
                                bankInfo: null,
                                bankAccount: null,
                                vendorPayment: 'null'
                            }

                            vendorBankArr.push(bankAccount);
                        }


                    }
                }

                res.render('restaurant/bankAccountList.ejs', {
                    vendorBankArr: vendorBankArr,
                    layout: false,
                    user: user,
                    vendorCondtxt: vendorCondtxt,
                    moment: moment
                });

            });

    } else {
        vendorSchema.find({ isDisabled: { $ne: true } })
            .sort({ createdAt: -1 })
            .then(async (vendors) => {
                var vendorBankArr = [];
                if (vendors.length > 0) {
                    for (let vendor of vendors) {
                        var vendorBankAccount = await vendorAccountSchema.findOne({ vendorId: vendor._id, isCurrent: true });

                        if (vendorBankAccount != null) {
                            var bankAccount = {
                                _id: vendorBankAccount._id,
                                accountNo: vendorBankAccount.accountNo,
                                businessName: vendorBankAccount.businessName,
                                accountName: vendorBankAccount.accountName,
                                isActive: vendorBankAccount.isActive
                            }
                            bankAccount.vendor = vendor;
                            bankAccount.bankInfo = await bankAccountSchema.findOne({ bankCode: vendorBankAccount.bankCode });
                            bankAccount.vendorPayment = await vendorPaymentSettingSchema.findOne({ vendorId: vendorBankAccount.vendorId });
                        } else {
                            var bankAccount = {
                                _id: '',
                                accountNo: '',
                                businessName: '',
                                accountName: '',
                                isActive: 'null',
                                vendor: vendor,
                                bankInfo: null,
                                bankAccount: null,
                                vendorPayment: 'null'
                            }
                        }
                        vendorBankArr.push(bankAccount);

                    }
                }

                res.render('restaurant/bankAccountList.ejs', {
                    vendorBankArr: vendorBankArr,
                    layout: false,
                    user: user,
                    vendorCondtxt: vendorCondtxt,
                    moment: moment
                });

            });
    }


}

module.exports.changeBankStatus = (req, res) => {

    var bankAccountId = req.query.id;
    var accountStatus = req.query.status;
    if (bankAccountId != undefined) {

        vendorAccountSchema
            .findOne({ _id: bankAccountId })
            .then((vendorAccount) => {

                if (accountStatus == 'Active') {
                    var updateStatus = {
                        isActive: false
                    }
                } else {
                    var updateStatus = {
                        isActive: true,
                        businessName: vendorAccount.accountName
                    }
                }

                vendorAccountSchema.updateOne({ _id: bankAccountId }, {
                    $set: updateStatus
                }, function (err, resp) {
                    if (err) {
                        req.flash('msgLog', 'Something went wrong.');
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    } else {
                        if (resp.nModified == 1) {

                            //SAVE LOG
                            var logObj = {
                                vendorId: vendorAccount.vendorId,
                                type: 'Restaurant Bank Account Status Change',
                                log: `Admin changed the bank account status`,
                                addedTime: new Date()
                            }
                            saveVendorLog(logObj);

                            req.flash('msgLog', 'Status updated successfully.');
                            req.flash('msgType', 'success');
                            res.redirect(req.headers.referer);
                            return;
                        } else {
                            req.flash('msgLog', 'Something went wrong.');
                            req.flash('msgType', 'danger');
                            res.redirect(req.headers.referer);
                            return;
                        }
                    }
                });



            })





    }
}

module.exports.updateBankCommission = (req, res) => {

    // console.log(req.body);
    // return;
    var vendorId = req.body.vendorId;
    var commission = req.body.commission;


    vendorPaymentSettingSchema
        .findOne({ vendorId: vendorId })
        .then((vendorSettings) => {

            if (vendorSettings != null) {
                vendorPaymentSettingSchema.updateOne({ vendorId: vendorId }, {
                    $set: { paymentPercentage: commission }
                }, function (err, resp) {
                    if (err) {
                        console.log('err', err);
                        var responseObj = { msg: 'Something went wrong.' };
                        res.status(500).json(responseObj)
                    } else {
                        if (resp.nModified == 1) {

                            var responseObj = {
                                msg: 'Commission percentage updated successfully.',
                                body: {}
                            };
                            res.status(200).json(responseObj)
                        } else {
                            console.log('err', err);
                            var responseObj = { msg: 'Something went wrong.' };
                            res.status(500).json(responseObj)
                        }
                    }

                });
            } else {

                var vendorPaymentSettingsObj = {
                    vendorId: vendorId,
                    paymentPercentage: commission,
                    sendPaymentEmail: 'ACTIVE'
                }

                new vendorPaymentSettingSchema(vendorPaymentSettingsObj).save(function (err, banner) {
                    if (err) {
                        console.log('err', err);
                        var responseObj = { msg: 'Something went wrong.' };
                        res.status(500).json(responseObj)
                    } else {

                        var responseObj = {
                            msg: 'Commission percentage updated successfully.',
                            body: {}
                        };
                        res.status(200).json(responseObj)
                    }
                });

            }
        })
        .catch((error) => {
            console.log('error', error);
            var responseObj = { msg: 'Something went wrong.' };
            res.status(500).json(responseObj)

        })

}

module.exports.unapprovedItemList = (req, res) => {

    // itemSchema.updateMany({ _id: { $ne: '5f22b3d736852e3dbc962a76' } }, {
    //     $set: {isApprove: false}
    // }, function (err, resp) {
    //     console.log(err);
    //     console.log(resp);
    // });

    var user = req.session.user;
    var reqQuery = req.query;
    var vendorId = '';
    var isApprove = '';
    var itemIdTxt = '';
    var itemCond = {};

    var toDateNw = new Date();
    var fromDateNw = '01/01/2020'


    var fromDate = req.query.from;
    var toDate = req.query.to;

    if (fromDate == undefined) {
        fromDate = fromDateNw;
        fromDateNw = createDateFormatFilter(fromDateNw,1);
    } else {
        fromDateNw = createDateFormatFilter(fromDate, 1)

    }

    if (toDate == undefined) {
        toDate = listDateFilter(toDateNw);
    } else {
        toDateNw = createDateFormatFilter(toDate, 2)
    }

    itemCond.createdAt = { $gte: fromDateNw, $lte: toDateNw }



    if ((reqQuery.isApprove == 'false') || (reqQuery.isApprove == false)) {
        itemCond.isApprove = { $ne: true }
        isApprove = 'false'
    } else if ((reqQuery.isApprove == 'true') || (reqQuery.isApprove == true)) {
        itemCond.isApprove = true
        isApprove = 'true'
    } else if ((reqQuery.isApprove == 'all')) {
       // itemCond.isApprove = true
        isApprove = 'all'
    }


    var reqQueryRestaurant = req.query.restaurant;
    if ((reqQueryRestaurant != undefined) && (reqQueryRestaurant != '') && (reqQueryRestaurant != 'all')) {
        var reqQueryRestaurant = reqQueryRestaurant.split(",");
        vendorId = reqQueryRestaurant;
        itemCond.vendorId = reqQueryRestaurant;
    } else {
        vendorId = 'all';
    }


    if ((reqQuery.itemId != '') && (reqQuery.itemId != undefined)) {
        var itemCond = {};
        itemCond._id = reqQuery.itemId;
        itemIdTxt = 'Item'
    }

    console.log(itemCond);

    // return;


    itemSchema.find(itemCond)
        .sort({ updatedAt: -1 })
        .then(async (itemResponseArr) => {

            // console.log('itemResponseArr',itemResponseArr);

            var itemResponsesArr = [];
            if (itemResponseArr.length > 0) {
                for (let itemResponse of itemResponseArr) {
                    var itemObj = {
                        itemName: itemResponse.itemName,
                        price: itemResponse.price,
                        isActive: itemResponse.isActive,
                        isApprove: itemResponse.isApprove,
                        menuImage: itemResponse.menuImage,
                        _id: itemResponse._id,
                        discountType: itemResponse.discountType,
                        discountAmount: itemResponse.discountAmount,
                        createdAt: itemResponse.createdAt,
                        updatedAt: itemResponse.updatedAt,
                    }

                    itemObj.vendor = await vendorSchema.findOne({ _id: itemResponse.vendorId });
                    itemObj.category = await categorySchema.findOne({ _id: itemResponse.categoryId });

                    itemResponsesArr.push(itemObj);
                }
            }

          //  console.log(itemResponsesArr);

            var imagePath = `${SERVERIMAGEPATH}vendor/`

            var allRestaurant = await vendorSchema.find({ isDisabled: { $ne: true } }).sort({ restaurantName: 1 });


            res.render('restaurant/unapprovedItemList.ejs', {
                itemResponsesArr: itemResponsesArr, serverImagePath: imagePath, allRestaurant: allRestaurant, vendorId: vendorId,
                layout: false,
                user: user,
                moment: moment,
                isApprove: isApprove,
                fromDate: fromDate,
                toDate: toDate,
                itemIdTxt: itemIdTxt
            });
        });
}

module.exports.itemList = async (req, res) => {

    var user = req.session.user;
    var reqQuery = req.query;
    var vendorId = '';
    var vendorName = '';


    var itemCond = {};
    if ((reqQuery.isApprove == 'false') || (reqQuery.isApprove == false)) {
        itemCond.isApprove = { $ne: true }
    }
    if (reqQuery.restaurant == 'all') {
        vendorId = 'all';

    } else {
        itemCond.vendorId = reqQuery.restaurant;
        vendorId = reqQuery.restaurant;
        var vendorArr = await vendorSchema.findOne({ _id: vendorId });
        vendorName = vendorArr.restaurantName;
    }

    itemSchema.find(itemCond)
        .sort({ createdAt: -1 })
        .then(async (itemResponseArr) => {

            // console.log('itemResponseArr',itemResponseArr);

            var itemResponsesArr = [];
            if (itemResponseArr.length > 0) {
                for (let itemResponse of itemResponseArr) {
                    var itemObj = {
                        itemName: itemResponse.itemName,
                        price: itemResponse.price,
                        isActive: itemResponse.isActive,
                        isApprove: itemResponse.isApprove,
                        menuImage: itemResponse.menuImage,
                        discountType: itemResponse.discountType,
                        discountAmount: itemResponse.discountAmount,
                        _id: itemResponse._id,
                    }
                    itemObj.category = await categorySchema.findOne({ _id: itemResponse.categoryId });

                    itemResponsesArr.push(itemObj);
                }
            }

            //console.log(itemResponsesArr);

            var imagePath = `${SERVERIMAGEPATH}vendor/`


            res.render('restaurant/itemList.ejs', {
                itemResponsesArr: itemResponsesArr, serverImagePath: imagePath, vendorId: vendorId, vendorName: vendorName, layout: false,
                user: user
            });
        });
}

module.exports.changeItemApprove = (req, res) => {

    var itemId = req.query.id;
    var itemApproveStatus = req.query.isApprove;
    if (itemId != undefined) {

        if (itemApproveStatus == 'Active') {
            var isApprove = false
        } else {
            var isApprove = true
        }


        console.log('isApprove', isApprove);
        itemSchema.updateOne({ _id: itemId }, {
            $set: {
                isApprove: isApprove
            }
        }, function (err, resp) {
            if (err) {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            } else {
                if (resp.nModified == 1) {
                    req.flash('msgLog', 'Status updated successfully.');
                    req.flash('msgType', 'success');
                    res.redirect(req.headers.referer);
                    return;
                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }
            }
        });

    }
}

module.exports.fetchMenuDetails = (req, res) => {


    var itemId = req.body.itemId;
    console.log('itemId', itemId);
    if (itemId != undefined) {



        itemSchema.findOne({ _id: itemId })
            .then(async (item) => {

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
                    _id: item._id,
                }

                itemsObj.itemExtra = extraitem;

                var responseObj = {
                    msg: 'Item details fetched successfully.',
                    body: itemsObj
                };
                res.status(200).json(responseObj)

            })
            .catch((err) => {
                console.log(err);

                var responseObj = { msg: 'Something went wrong.' };

                res.status(500).json(responseObj)
            });

    }
}

module.exports.itemAdd = async (req, res) => {

    var user = req.session.user;

    var reqQuery = req.query;
    var vendorId = reqQuery.vendorId;

    if (vendorId != undefined) {

        var menuDiscountTypeArr = [
            {
                type: 'NONE',
                name: 'Do not Apply Discount'
            },
            {
                type: 'PERCENTAGE',
                name: 'Percentage'
            },
            {
                type: 'FLAT',
                name: 'Flat Rate'
            }
        ]

        var categoryArr = await categorySchema.find({});

        var imagePath = `${SERVERIMAGEPATH}`

        var itemofvendor = await itemSchema.find({ vendorId: vendorId });

        //   console.log('itemofvendor',itemofvendor);
        var allExtra = [];
        var allOption = [];

        if (itemofvendor.length > 0) {
            for (let itemofvndr of itemofvendor) {

                //EXTRA
                var extraitem = await ItemExtraSchema.find({ itemId: itemofvndr._id }, { _id: 1, itemName: 1, price: 1, isActive: 1 });

                if (extraitem.length > 0) {
                    for (let allextr of extraitem) {
                        allExtra.push(allextr);
                    }
                }

                //OPTION
                var opTionitem = itemofvndr.itemOptions;

                if (opTionitem.length > 0) {
                    for (let opTioniTm of opTionitem) {
                        if (opTioniTm.arrOptions.length > 0) {
                            for (let appOp of opTioniTm.arrOptions) {
                                allOption.push(appOp);
                            }
                        }
                    }
                }

            }
        }

        res.render('restaurant/itemAdd.ejs', {
            serverImagePath: imagePath, menuDiscountTypeArr: menuDiscountTypeArr, categoryArr: categoryArr, layout: false,
            user: user, vendorId: vendorId, allExtra: allExtra, allOption: allOption
        });

    }


}

module.exports.itemAddPost = async (req, res) => {


    //PREPARATION TIME
    var preparationDay = req.body.preparationDay;
    var preparationHour = req.body.preparationHour;
    var preparationMin = req.body.preparationMin;

    var preparationTime = ((Number(preparationDay) * 1440) + (Number(preparationHour) * 60) + Number(preparationMin))
    //PREPARATION TIME

    var reqBody = {
        vendorId: req.body.vendorId,
        itemName: req.body.menuName,
        categoryId: req.body.menuCategory,
        type: 'NON VEG',
        waitingTime: preparationTime,
        price: req.body.menuPrice,
        itemExtra: req.body.extraIndx,
        itemOption: req.body.opIndx,
        discountType: req.body.discountType,
        discountAmount: req.body.discountAmount,
        validityFrom: req.body.validityFrom,
        validityTo: req.body.validityTo
    }

    var files = req.files;


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
            var menuImage = await uploadImage(files.menuImage, 'menuImage');
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
                isApprove: true
            };

            console.log(itemData);

            new itemSchema(itemData).save(async function (err, result) {
                if (err) {
                    console.log(err);

                    req.flash('msgLog', 'Internal DB error.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
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
                                    req.flash('msgLog', 'Internal DB error.');
                                    req.flash('msgType', 'danger');
                                    res.redirect(req.headers.referer);
                                    return;
                                } else {
                                    //SAVE LOG
                                    var logObj = {
                                        vendorId: reqBody.vendorId,
                                        type: 'Restaurant Add Menu Item',
                                        log: `Restaurant added a menu item (${reqBody.itemName})`,
                                        addedTime: new Date()
                                    }
                                    saveVendorLog(logObj);
                                    req.flash('msgLog', 'Item added successfully.');
                                    req.flash('msgType', 'success');
                                    res.redirect(`/restaurant/itemList?restaurant=${reqBody.vendorId}`);
                                    return;
                                }
                            });

                        } else {
                            req.flash('msgLog', 'Invalid Item extra value.');
                            req.flash('msgType', 'danger');
                            res.redirect(req.headers.referer);
                            return;
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
                        req.flash('msgLog', 'Item added successfully.');
                        req.flash('msgType', 'success');
                        res.redirect(`/restaurant/itemList?restaurant=${reqBody.vendorId}`);
                        return;
                    }

                }
            });
        } else {
            req.flash('msgLog', 'Menu image upload failed.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        }
    } else {
        req.flash('msgLog', 'Invalid Item extra value.');
        req.flash('msgType', 'danger');
        res.redirect(req.headers.referer);
        return;
    }


}

module.exports.itemEdit = async (req, res) => {

    var user = req.session.user;

    var reqQuery = req.query;

    var itemId = reqQuery.itemId;
    var itemCond = { _id: itemId }


    itemSchema
        .findOne(itemCond)
        .then(async (item) => {
            var allItems = [];
            if (item != null) {

                var extraitem = await ItemExtraSchema.find({ itemId: itemId }, { _id: 1, itemName: 1, price: 1, isActive: 1 });


                if (item.validityFrom != null) {
                    var validityFrom = editDateFormat(item.validityFrom);
                    var validityTo = editDateFormat(item.validityTo);
                } else {
                    var validityFrom = '';
                    var validityTo = '';
                }

                var waitingObj = timeConvert(item.waitingTime);



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
                    _id: item._id,
                }

                itemsObj.itemExtra = extraitem;


            }

            var menuDiscountTypeArr = [
                {
                    type: 'NONE',
                    name: 'Do not Apply Discount'
                },
                {
                    type: 'PERCENTAGE',
                    name: 'Percentage'
                },
                {
                    type: 'FLAT',
                    name: 'Flat Rate'
                }
            ]

            var categoryArr = await categorySchema.find({});

            var imagePath = `${SERVERIMAGEPATH}`


            //MENU OPTIONS
            var dataItm = [];
            var optionItems = [];
            if (item.itemOptions.length > 0) {
                var opId = 0;
                for (let options of item.itemOptions) {
                    var optionType = {
                        id: opId,
                        optionType: options.optionTitle
                    }

                    if (options.arrOptions.length > 0) {

                        var oIId = 0;
                        for (let arrop of options.arrOptions) {
                            var optionItem = {
                                id: oIId,
                            };


                            optionItems.push(optionItem);
                            oIId++;
                        }
                    }
                    dataItm.push(optionType);
                    opId++;
                }
            }

            //MENU EXTRA
            var extraItems = [];
            if (itemsObj.itemExtra.length > 0) {
                var exId = 0;
                for (let arrop of itemsObj.itemExtra) {
                    var extraItem = {
                        id: exId,
                    };

                    extraItems.push(extraItem);
                    exId++;
                }
            }


            var itemofvendor = await itemSchema.find({ vendorId: itemsObj.vendorId });
            //   console.log('itemofvendor',itemofvendor);
            var allExtra = [];
            var allOption = [];

            if (itemofvendor.length > 0) {
                for (let itemofvndr of itemofvendor) {

                    //EXTRA
                    var extraitem = await ItemExtraSchema.find({ itemId: itemofvndr._id }, { _id: 1, itemName: 1, price: 1, isActive: 1 });

                    if (extraitem.length > 0) {
                        for (let allextr of extraitem) {
                            allExtra.push(allextr);
                        }
                    }

                    //OPTION
                    var opTionitem = itemofvndr.itemOptions;

                    if (opTionitem.length > 0) {
                        for (let opTioniTm of opTionitem) {
                            if (opTioniTm.arrOptions.length > 0) {
                                for (let appOp of opTioniTm.arrOptions) {
                                    allOption.push(appOp);
                                }
                            }
                        }
                    }

                }
            }


            res.render('restaurant/itemEdit.ejs', {
                item: itemsObj, serverImagePath: imagePath, menuDiscountTypeArr: menuDiscountTypeArr, categoryArr: categoryArr, itemId: itemId, layout: false,
                user: user, dataItm: dataItm, optionItems: optionItems, extraItems: extraItems, waitingObj: waitingObj, allExtra: allExtra, allOption: allOption
            });

        })



}
module.exports.itemEditPost = async (req, res) => {

    // console.log(req.body);
    // return;

    //PREPARATION TIME
    var preparationDay = req.body.preparationDay;
    var preparationHour = req.body.preparationHour;
    var preparationMin = req.body.preparationMin;

    var preparationMin = ((Number(preparationDay) * 1440) + (Number(preparationHour) * 60) + Number(preparationMin))
    //PREPARATION TIME
    var reqBody = {
        vendorId: req.body.vendorId,
        itemName: req.body.menuName,
        categoryId: req.body.menuCategory,
        type: 'NON VEG',
        waitingTime: preparationMin,
        price: req.body.menuPrice,
        itemExtra: req.body.extraIndx,
        itemOption: req.body.opIndx,
        discountType: req.body.discountType,
        discountAmount: req.body.discountAmount,
        validityFrom: req.body.validityFrom,
        validityTo: req.body.validityTo,
        itemId: req.body.itemId
    }

    var files = req.files;

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

        itemSchema
            .findOne({ _id: reqBody.itemId })
            .then(async (itemGet) => {

                if (itemGet != null) {
                    // console.log('itemGet',itemGet);
                    // return;

                    // var getdiscountAmount = itemGet.discountAmount;
                    // var getdiscountType = itemGet.discountType;
                    // var getvalidityFrom = listGetDateFormat(itemGet.validityFrom);
                    // var getvalidityTo = listGetDateFormat(itemGet.validityTo);

                    // var reqdiscountAmount = reqBody.discountAmount;
                    // var reqdiscountType = reqBody.discountType;
                    // var reqvalidityFrom = reqBody.validityFrom;
                    // var reqvalidityTo = reqBody.validityTo;



                    var itemData = {}

                    var menuImage = itemGet.menuImage;
                    //License Upload

                    // console.log('files', files);
                    if (files != null) {
                        if (files.menuImage != undefined) {

                            if (itemGet.menuImage != '') {
                                var fs = require('fs');
                                var filePath = `${SERVERIMAGEUPLOADPATH}vendor/${itemGet.menuImage}`;
                                fs.unlink(filePath, (err) => { });
                            }
                            var menuImage = await uploadImage(files.menuImage, 'menuImage');

                            // itemData.isApprove = false;

                            //console.log('itemData1',itemData);
                        }
                    }

                    if (menuImage != 'error') {

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



                        itemSchema.update({ _id: reqBody.itemId }, {
                            $set: itemData
                        }, async function (err, result) {
                            if (err) {
                                console.log(err);

                                req.flash('msgLog', 'Internal DB error');
                                req.flash('msgType', 'danger');
                                res.redirect(req.headers.referer);
                                return;
                            } else {
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
                                                    req.flash('msgLog', 'Internal DB error');
                                                    req.flash('msgType', 'danger');
                                                    res.redirect(req.headers.referer);
                                                    return;
                                                } else {
                                                    //SAVE LOG
                                                    var logObj = {
                                                        vendorId: reqBody.vendorId,
                                                        type: 'Restaurant Update Menu Item',
                                                        log: `Restaurant updated a menu item (${reqBody.itemName})`,
                                                        addedTime: new Date()
                                                    }
                                                    saveVendorLog(logObj);

                                                    req.flash('msgLog', 'Item updated successfully');
                                                    req.flash('msgType', 'success');
                                                    res.redirect(`/restaurant/itemList?restaurant=${reqBody.vendorId}`);
                                                    return;
                                                }
                                            });
                                        });

                                    } else {
                                        req.flash('msgLog', 'Invalid Item extra value.');
                                        req.flash('msgType', 'danger');
                                        res.redirect(req.headers.referer);
                                        return;
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
                                    req.flash('msgLog', 'Item updated successfully');
                                    req.flash('msgType', 'success');
                                    res.redirect(`/restaurant/itemList?restaurant=${reqBody.vendorId}`);
                                    return;
                                }

                            }
                        });
                    } else {
                        req.flash('msgLog', 'Menu image upload failed.');
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    }
                } else {
                    req.flash('msgLog', 'Item not found.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }

            })
            .catch((err) => {
                console.log('err', err)
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            })


    } else {
        req.flash('msgLog', 'Invalid Item extra value.');
        req.flash('msgType', 'danger');
        res.redirect(req.headers.referer);
        return;
    }



}

module.exports.itemDelete = async (req, res) => {

    var user = req.session.user;

    var reqQuery = req.query;

    var itemId = reqQuery.itemId;
    var itemCond = { _id: itemId }


    itemSchema
        .findOne(itemCond)
        .then(async (item) => {
            if (item != null) {

                await itemSchema.deleteOne({ _id: itemId }, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });

                await ItemOptionSchema.deleteMany({ itemId: itemId });

                await ItemExtraSchema.deleteMany({ itemId: itemId });

                if (item.menuImage != '') {
                    var fs = require('fs');
                    var filePath = `${SERVERIMAGEUPLOADPATH}vendor/${item.menuImage}`;
                    fs.unlink(filePath, (err) => { });
                }

                req.flash('msgLog', 'Item deleted successfully');
                req.flash('msgType', 'success');
                res.redirect(req.headers.referer);
                return;

            } else {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            }



        })



}
module.exports.sendPushMessage = (req, res) => {

    var user = req.session.user;

    var reqQuery = req.query;
    var vendorIdArr = [];
    var vendorName = '';


    var venndorCond = {
        isDisabled: { $ne: true }
    };
    if (reqQuery.restaurant != undefined) {
        venndorCond._id = reqQuery.restaurant;
        vendorIdArr.push(reqQuery.restaurant);

    }


    vendorSchema.find(venndorCond)
        .then((vendors) => {


            res.render('restaurant/sendPushMessage.ejs', {
                vendors: vendors, vendorIdArr: vendorIdArr, layout: false,
                user: user
            });
        })

}

module.exports.sendPushPost = async (req, res) => {

    //  console.log(req.body);
    //   return;

    var reqQuery = req.query.id;

    if (reqQuery != undefined) {
        var userNotification = await UserNotificationSchema.findOne({ _id: reqQuery });

        var restaurantArr = userNotification.userId;
        var pushMessage = userNotification.content;
        var notificationTitle = userNotification.title;
    } else {
        var restaurantArr = req.body.restaurant;
        var pushMessage = req.body.pushMessage;
        var notificationTitle = req.body.notificationTitle;
    }



    var vendorArr = [];
    if (!Array.isArray(restaurantArr)) {
        vendorArr.push(restaurantArr);
    } else if (Array.isArray(restaurantArr)) {
        vendorArr = restaurantArr;
    }

    console.log(vendorArr);

    if (vendorArr.length > 0) {
        for (let vendor of vendorArr) {

            //Fetch Current Count
            var vendorOwnerData = await vendorOwnerSchema.findOne({ vendorId: vendor });
            var currentCount = vendorOwnerData.badgeCount;
            var newCount = Number(Number(currentCount) + 1);

            var pushMessage = pushMessage;
            var receiverId = vendor;
            var pushDataset = {
                messageType: 'admin',
                badgeCount: newCount,
            };
            sendPush(receiverId, pushMessage, pushDataset);

            //ADD DATA IN NOTIFICATION TABLE
            var userNotificationData = {
                userId: receiverId,
                orderId: '',
                userType: 'VENDOR',
                title: notificationTitle,
                type: 'NEW',
                content: pushMessage,
                isRead: 'NO',
                automatic: 'NO'
            }

            await vendorOwnerSchema.updateOne({ vendorId: receiverId }, {
                $set: {
                    badgeCount: newCount
                }
            });
            new UserNotificationSchema(userNotificationData).save(async function (err, resultNt) {
                console.log('err', err);
                console.log('result', resultNt);
            });
        }

        req.flash('msgLog', 'Push message send successfully.');
        req.flash('msgType', 'success');
        res.redirect(req.headers.referer);
        return;
    }




}

module.exports.vendorNotificationList = (req, res) => {

    var user = req.session.user;

    var reqQuery = req.query.automatic;


    // UserNotificationSchema.updateMany({ orderId:'' }, {
    //     $set: {automatic: 'NO'}
    // }, function (err, resp) {
    //     console.log(err);
    //     console.log(resp);
    // });

    if (reqQuery == undefined) {
        var aut = 0;
        var reqNotObj = {
            userType: 'VENDOR',
            automatic: 'NO'
        }
    } else {
        var aut = 1;
        var reqNotObj = {
            userType: 'VENDOR',
            automatic: 'YES'
        }
    }

    UserNotificationSchema.find(reqNotObj)
        .sort({ createdAt: -1 })
        .then(async (notifications) => {

            // console.log(notifications);

            // return;
            var notificationArr = [];
            if (notifications.length > 0) {
                for (let notification of notifications) {
                    var notificationObj = {
                        title: notification.title,
                        content: notification.content,
                        _id: notification._id,
                        createdAt: listNotDateFormat(notification.createdAt)

                    }
                    notificationObj.vendor = await vendorSchema.findOne({ _id: notification.userId });

                    notificationArr.push(notificationObj);
                }
            }

            if (aut == 1) {
                res.render('restaurant/vendorAutomaticNotificationList.ejs', {
                    notificationArr: notificationArr, layout: false,
                    user: user
                });
            } else {
                res.render('restaurant/vendorNotificationList.ejs', {
                    notificationArr: notificationArr, layout: false,
                    user: user
                });
            }

        })

}

module.exports.deleteNotification = (req, res) => {

    var notificationId = req.query.id;
    if (notificationId != undefined) {

        UserNotificationSchema
            .findOne({ _id: notificationId })
            .then(async (notGet) => {

                if (notGet != null) {

                    UserNotificationSchema.deleteOne({ _id: notificationId }, function (err) {
                        if (err) {
                            req.flash('msgLog', 'Something went wrong.');
                            req.flash('msgType', 'danger');
                            res.redirect(req.headers.referer);
                            return;
                        } else {

                            req.flash('msgLog', 'Notification deleted successfully.');
                            req.flash('msgType', 'success');
                            res.redirect(req.headers.referer);
                            return;

                        }
                    });
                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }

            });
    }
}

module.exports.vendorNotificationEdit = async (req, res) => {

    var user = req.session.user;

    var reqQuery = req.query;

    var id = reqQuery.id;
    var notCond = { _id: id, userType: 'VENDOR' }


    UserNotificationSchema
        .findOne(notCond)
        .then(async (notification) => {
            var allItems = [];
            if (notification != null) {

                var notificationObj = {
                    title: notification.title,
                    content: notification.content,
                    _id: notification._id,
                    createdAt: listNotDateFormat(notification.createdAt)

                }
                notificationObj.vendor = await vendorSchema.findOne({ _id: notification.userId });


                res.render('restaurant/vendorNotificationEdit.ejs', {
                    notificationObj: notificationObj, notificationId: id, layout: false,
                    user: user
                });

            }




        })



}

module.exports.vendorNotificationEditPost = async (req, res) => {

    //  console.log(req.body);
    //   return;

    var notificationId = req.body.notificationId;

    var notObjData = {
        title: req.body.notificationTitle,
        content: req.body.pushMessage
    }


    UserNotificationSchema.updateOne({ _id: notificationId }, {
        $set: notObjData
    }, async function (err, result) {
        if (err) {
            console.log(err);
            req.flash('msgLog', 'Internal DB error');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        } else {
            req.flash('msgLog', 'Notification updated successfully.');
            req.flash('msgType', 'success');
            res.redirect('/restaurant/vendorNotificationList');
            return;
        }
    });

}


module.exports.vendorSetting = async (req, res) => {

    var user = req.session.user;

    var reqQuery = req.query;
    var vendorId = '';
    var vendorName = '';

    var venndorCond = {};
    if (reqQuery.restaurant != undefined) {
        venndorCond.vendorId = reqQuery.restaurant;
        vendorId = reqQuery.restaurant;
    }

    console.log('venndorCond', venndorCond);

    var vendors = await vendorSchema.find({ isDisabled: { $ne: true } });

    var vendorSettings = await vendorPaymentSettingSchema.findOne(venndorCond);

    console.log(vendorSettings);
    if (vendorSettings == null) {
        var vendorSettings = {
            paymentPercentage: '',
            sendPaymentEmail: 'ACTIVE'
        }
    }

    res.render('restaurant/vendorSetting.ejs', {
        vendors: vendors, vendorId: vendorId, vendorSettings: vendorSettings, layout: false,
        user: user
    });

}

module.exports.vendorSettingsPost = async (req, res) => {

    var reqBody = req.body;

    var restaurantArr = reqBody.restaurant;

    var commission = req.body.commission;

    if (req.body.sendPaymentEmail == undefined) {
        var sendPaymentEmail = 'INACTIVE'
    } else {
        var sendPaymentEmail = 'ACTIVE'
    }


    var vendrArr = [];
    if (!Array.isArray(restaurantArr)) {
        vendrArr.push(restaurantArr);
    } else {
        vendrArr = restaurantArr;
    }

    if (vendrArr.length > 0) {
        for (let vendorId of vendrArr) {


            vendorPaymentSettingSchema
                .findOne({ vendorId: vendorId })
                .then((vendorSettings) => {

                    if (vendorSettings != null) {
                        vendorPaymentSettingSchema.updateOne({ vendorId: vendorId }, {
                            $set: { paymentPercentage: commission, sendPaymentEmail: sendPaymentEmail }
                        }, function (err, resp) {
                            if (err) {
                                console.log('err', err);
                                req.flash('msgLog', 'Something went wrong.');
                                req.flash('msgType', 'danger');
                                res.redirect(req.headers.referer);
                                return;
                            } else {
                                if (resp.nModified == 1) {

                                    // req.flash('msgLog', 'Settings updated successfully.');
                                    // req.flash('msgType', 'success');
                                    // res.redirect(req.headers.referer);
                                    // return;
                                } else {

                                    req.flash('msgLog', 'Something went wrong.');
                                    req.flash('msgType', 'danger');
                                    res.redirect(req.headers.referer);
                                    return;
                                }
                            }

                        });
                    } else {

                        var vendorPaymentSettingsObj = {
                            vendorId: vendorId,
                            paymentPercentage: commission,
                            sendPaymentEmail: sendPaymentEmail
                        }

                        new vendorPaymentSettingSchema(vendorPaymentSettingsObj).save(function (err, banner) {
                            if (err) {
                                console.log('err', err);
                                req.flash('msgLog', 'Something went wrong.');
                                req.flash('msgType', 'danger');
                                res.redirect(req.headers.referer);
                                return;
                            } else {


                            }
                        });

                    }
                })
                .catch((error) => {
                    console.log('error', error);
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;

                })


        }
    }

    req.flash('msgLog', 'Settings updated successfully.');
    req.flash('msgType', 'success');
    res.redirect(req.headers.referer);
    return;

}
//Vendor Related Image uplaod
function uploadImage(file, name) {
    return new Promise(function (resolve, reject) {
        console.log(file.name);
        //Get image extension
        var ext = getExtension(file.name);

        // The name of the input field (i.e. "image") is used to retrieve the uploaded file
        let sampleFile = file;

        var file_name = `${name}-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

        // Use the mv() method to place the file somewhere on your server
        sampleFile.mv(`${SERVERIMAGEUPLOADPATH}vendor/${file_name}`, function (err) {
            if (err) {
                console.log('err', err);
                return reject('error');
            } else {
                return resolve(file_name);
            }
        });
    });
}

function getExtension(filename) {
    return filename.substring(filename.indexOf('.') + 1);
}


async function updateVendorTime(reqBody) {

    return new Promise(async function (resolve, reject) {
        // console.log(reqBody);


        var restaurantTime = [];
        var mondayObj = {};
        var tuesdayObj = {};
        var wednesdayObj = {};
        var thursdayObj = {};
        var fridayObj = {};
        var saturdayObj = {};
        var sundayObj = {};

        if (reqBody.mondayDay == 'on') {
            mondayObj.day = 'Monday';
            mondayObj.startTime = reqBody.mondayopenTime
            mondayObj.endTime = reqBody.mondaycloseTime

            restaurantTime.push(mondayObj);
        }


        if (reqBody.tuesdayDay == 'on') {
            tuesdayObj.day = 'Tuesday';
            tuesdayObj.startTime = reqBody.tuesdayopenTime
            tuesdayObj.endTime = reqBody.tuesdaycloseTime

            restaurantTime.push(tuesdayObj);
        }


        if (reqBody.wednesdayDay == 'on') {
            wednesdayObj.day = 'Wednesday';
            wednesdayObj.startTime = reqBody.wednesdayopenTime
            wednesdayObj.endTime = reqBody.wednesdaycloseTime

            restaurantTime.push(wednesdayObj);
        }


        if (reqBody.thursdayDay == 'on') {
            thursdayObj.day = 'Thursday';
            thursdayObj.startTime = reqBody.thursdayopenTime
            thursdayObj.endTime = reqBody.thursdaycloseTime

            restaurantTime.push(thursdayObj);
        }


        if (reqBody.fridayDay == 'on') {
            fridayObj.day = 'Friday';
            fridayObj.startTime = reqBody.fridayopenTime
            fridayObj.endTime = reqBody.fridaycloseTime

            restaurantTime.push(fridayObj);
        }


        if (reqBody.saturdayDay == 'on') {
            saturdayObj.day = 'Saturday';
            saturdayObj.startTime = reqBody.saturdayopenTime
            saturdayObj.endTime = reqBody.saturdaycloseTime

            restaurantTime.push(saturdayObj);
        }


        if (reqBody.sundayDay == 'on') {
            sundayObj.day = 'Sunday';
            sundayObj.startTime = reqBody.sundayopenTime
            sundayObj.endTime = reqBody.sundaycloseTime

            restaurantTime.push(sundayObj);
        }


        var validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        var validZone = ['AM', 'PM'];

        if (reqBody.restaurantClose == 'on') {
            var restaurantClose = true;
        } else {
            var restaurantClose = false;
        }


        if ((restaurantClose == true) || (restaurantClose == 'true')) {

            var updateVendor = {
                restaurantClose: restaurantClose
            }

            await vandorTimeSchema.deleteMany({ vendorId: reqBody.vendorId });

            vendorSchema.updateOne({ _id: reqBody.vendorId }, {
                $set: updateVendor
            }, function (err, res) {
                if (err) {
                    return resolve('Something went wrong');
                } else {
                    return resolve('success');
                }
            });


        } else {
            var restaurantTimeObj = restaurantTime;
            console.log('restaurantTimeObj', restaurantTimeObj);
            if (restaurantTimeObj.length > 0) {
                var validateData = 0;
                var restaurantTimeValArr = [];
                for (let restaurantTimeVal of restaurantTimeObj) { //{ day: 'Monday', startTime: '10 AM', endTime: '10:30 PM' }
                    var restaurantTimeValdays = restaurantTimeVal.day; //Monday
                    var restaurantTimeValStartTime = restaurantTimeVal.startTime; //10 AM
                    var restaurantTimeValEndTime = restaurantTimeVal.endTime; //10:30 PM

                    if (validDays.includes(restaurantTimeValdays)) { //CHECK IF DAY IS VALID OR NOT

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
                    } else {
                        console.log('DAY value Invalid');
                        validateData++;
                    }
                }



                if (validateData == 0) { //NO ERROR IN RESTAURANT TIME JSON FORMAT
                    // console.log('validateData', validateData);
                    // console.log(restaurantTimeValArr);

                    var updateVendor = {
                        restaurantClose: restaurantClose
                    }

                    vandorTimeSchema.deleteMany({ vendorId: reqBody.vendorId }, function (err) {
                        if (err) console.log(err);

                        var vendorTimeArray = [];

                        vandorTimeSchema.insertMany(restaurantTimeValArr, function (err, result) {
                            if (err) {
                                console.log(err);
                                return resolve('Something went wrong');
                            } else {
                                if (result) {
                                    for (let resultVal of result) {
                                        vendorTimeArray.push(resultVal._id);
                                    }
                                    updateVendor.vendorOpenCloseTime = vendorTimeArray;
                                }

                                console.log(updateVendor);

                                vendorSchema.update({ _id: reqBody.vendorId }, {
                                    $set: updateVendor
                                }, function (err, res) {
                                    if (err) {
                                        return resolve('Something went wrong');
                                    } else {
                                        return resolve('success');
                                    }
                                });
                            }

                        });
                    });
                } else {
                    return resolve('Something went wrong');
                }
                // console.log(validateData);
            } else {
                return resolve('Please check at least one day of the week, to Turn-On Restaurant availability.');
            }
        }


    });


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

function sendPush(receiverId, pushMessage, orderObj) {
    // console.log(receiverId);
    var pushMessage = pushMessage;

    vendorOwnerSchema
        .find({ vendorId: receiverId })
        .then(function (allowners) {
            vendorOwnerId = [];
            if (allowners.length > 0) {
                for (let owner of allowners) {
                    vendorOwnerId.push(owner._id);
                }
            }

            //console.log(vendorOwnerId);
            userDeviceLoginSchemaSchema
                .find({ userId: { $in: vendorOwnerId }, userType: 'VENDOR' })
                .then(function (customers) {
                    // console.log(customers);
                    //   return;

                    if (customers.length > 0) {
                        for (let customer of customers) {
                            if (customer.deviceToken != '') {

                                // var msgStr = ",";
                                // msgStr += "~order_no~:~" + orderNo + "~";
                                // var dataset = "{~message~:~" + pushMessage + "~" + msgStr + "}";

                                var deviceToken = customer.deviceToken;

                                if (customer.appType == 'ANDROID') {


                                    //ANDROID PUSH START
                                    var andPushData = {
                                        'alert': pushMessage,
                                        'deviceToken': deviceToken,
                                        'pushMode': customer.pushMode,
                                        'dataset': orderObj
                                    }

                                    console.log(andPushData);


                                    PushLib.sendPushAndroid(andPushData)
                                        .then(async function (success) { //PUSH SUCCESS

                                            console.log('customer', customer);
                                            console.log('push_success_ANDROID', success);

                                        }).catch(async function (err) { //PUSH FAILED

                                            console.log('push_err_ANDROID', err);
                                        });
                                    //ANDROID PUSH END

                                } else if (customer.appType == 'IOS') {

                                    //IOS PUSH START
                                    var iosPushData = {
                                        'badge': orderObj.badgeCount,
                                        'alert': pushMessage,
                                        'deviceToken': deviceToken,
                                        'pushMode': customer.pushMode,
                                        'pushTo': 'VENDOR',
                                        'dataset': orderObj
                                    }
                                    //SEND PUSH TO IOS [APN]

                                    PushLib.sendPushIOS(iosPushData)
                                        .then(async function (success) { //PUSH SUCCESS
                                            console.log('push_success_IOS', success);

                                        }).catch(async function (err) { //PUSH FAILED
                                            console.log('push_err_IOS', err);
                                        });
                                    //IOS PUSH END

                                }

                            }
                        }
                    }



                })


        })



}

function createDateFormat(reqDate) {
    var date = reqDate;

    console.log('date', date);

    var monthsTOneArr = [1, 3, 5, 7, 8, 10, 12];

    var dateSpl = date.split("/");

    var month = dateSpl[1];
    var day = dateSpl[0];
    var year = dateSpl[2];




    var dateNew = new Date(`${month}-${day}-${year} 00:00:00`);
    // console.log(day);
    // console.log(dateNew);

    return dateNew;

}

function createDateFormatEnd(reqDate) {
    var date = reqDate;

    var monthsTOneArr = [1, 3, 5, 7, 8, 10, 12];

    var dateSpl = date.split("/");

    var month = dateSpl[1];
    var day = dateSpl[0];
    var year = dateSpl[2];




    var dateNew = new Date(`${month}-${day}-${year} 23:59:59`);
    // console.log(day);
    // console.log(dateNew);

    return dateNew;

}

function listNotDateFormat(date) {
    if ((date == '') || (date == undefined)) {
        return '';
    } else {

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        var dateFormatCheck = date;

        var day = dateFormatCheck.getDate();

        if (Number(day) < 10) {
            day = `0${day}`
        }

        var month = months[dateFormatCheck.getMonth()];

        if (Number(month) < 10) {
            month = `0${month}`
        }

        var year = dateFormatCheck.getFullYear();

        var seconds = dateFormatCheck.getSeconds();
        var minutes = dateFormatCheck.getMinutes();
        var hour = dateFormatCheck.getHours();

        if (Number(minutes) < 10) {
            minutes = `0${minutes}`
        }


        var dayOfWeek = days[dateFormatCheck.getDay()];

        var dateformat = `${dayOfWeek}, ${day} ${month}, ${year} ${hour}:${minutes}`

        //var dateformat = `${year}/${month}/${day} ${hour}:${minutes}`;

        return dateformat;
    }

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

function editDateFormat(date) {
    var dateFormatCheck = date;

    var day = dateFormatCheck.getDate();

    if (Number(day) < 10) {
        day = `0${day}`
    }

    var month = (dateFormatCheck.getMonth() + 1);

    if (Number(month) < 10) {
        month = `0${month}`
    }

    var year = dateFormatCheck.getFullYear();

    var dateformat = `${day}/${month}/${year}`

    return dateformat;
}

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function timeConvert(time) {
    return {
        day: Math.floor(time / 24 / 60),
        hour: Math.floor(time / 60 % 24),
        min: Math.floor(time % 60),
    }
}

function listDateFilter(date) {
    if ((date == '') || (date == undefined)) {
        return '';
    } else {

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


        var dateFormatCheck = date;

        var day = dateFormatCheck.getDate();

        if (Number(day) < 10) {
            day = `0${day}`
        }

        var month = (dateFormatCheck.getMonth() + 1);

        if (Number(month) < 10) {
            month = `0${month}`
        }

        var year = dateFormatCheck.getFullYear();

        var dateformat = `${day}/${month}/${year}`

        //var dateformat = `${year}/${month}/${day} ${hour}:${minutes}`;

        return dateformat;
    }
}

function createDateFormatFilter(reqDate, type) {
    var date = reqDate;

    var monthsTOneArr = [1, 3, 5, 7, 8, 10, 12];

    var dateSpl = date.split("/");

    var month = dateSpl[1];
    var day = dateSpl[0];
    var year = dateSpl[2];


    if (type == 1) {
        var dateNew = new Date(`${month}-${day}-${year} 00:00:00`);
    } else {
        var dateNew = new Date(`${month}-${day}-${year} 23:59:59`);
    }
    // console.log(day);
    // console.log(dateNew);

    return dateNew;

}