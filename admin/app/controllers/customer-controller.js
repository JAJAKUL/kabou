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
var customerLogSchema = require('../../schema/CustomerLog');
var ItemOptionSchema = require('../../schema/ItemOption');
var customerSchema = require('../../schema/Customer');
var moment = require('moment');


module.exports.customerList = (req, res) => {

    var user = req.session.user;

    var customerFilter = req.query.filter;

    var customerCond = {
        isDeleted: { $ne: true }
    };
    var customerCondtxt = '';
    if (customerFilter != undefined) {
        if (customerFilter == 'active') {
            customerCondtxt = 'active'
            customerCond.isActive = true;
        } else if (customerFilter == 'inactive') {
            customerCondtxt = 'inactive'
            customerCond.isActive = false;
        } else if (customerFilter == 'all') {
            customerCondtxt = 'all'
        }

    }

    var customerId = req.query.id;

    if(customerId != undefined) {
        customerCondtxt = 'id'
        customerCond._id = customerId;
    }

    customerSchema.find(customerCond)
        .sort({ createdAt: -1 })
        .then(async (customers) => {

            var imagePath = `${SERVERIMAGEPATH}vendor/`

            res.render('customer/customerList.ejs', {
                customers: customers, serverImagePath: imagePath, customerCondtxt: customerCondtxt,
                layout: false,
                user: user,
                moment: moment
            });
        });
}

module.exports.customerChangeStatus = (req, res) => {

    var customerId = req.query.id;
    var customerStatus = req.query.status;
    if (customerId != undefined) {

        if (customerStatus == 'Active') {
            var isActive = false
        } else {
            var isActive = true
        }


        customerSchema.updateOne({ _id: customerId }, {
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

module.exports.customerDelete = (req, res) => {

    var customerId = req.query.customer;

    if (customerId != undefined) {


        customerSchema.updateOne({ _id: customerId }, {
            $set: {
                isDeleted: true,
                isActive: false
            }
        }, function (err, resp) {
            if (err) {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            } else {
                if (resp.nModified == 1) {
                    req.flash('msgLog', 'Customer deleted successfully');
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

module.exports.customerEdit = (req, res) => {

    var user = req.session.user;

    var customerId = req.query.id;
    var responseDt = {};

    if (customerId != undefined) {

        customerSchema
            .findOne({ _id: customerId })
            .exec(async function (err, results) {

                console.log('err', err);


                if (results != null) {
                    var customerInfo = {
                        firstName: results.firstName,
                        lastName: results.lastName,
                        email: results.email,
                        phone: results.phone,
                        profileImage: `${results.profileImage}`,
                        location: results.location
                    };

                    var imagePath = `${SERVERIMAGEPATH}`

                    res.render('customer/customerEdit.ejs', {
                        customerInfo: customerInfo, serverImagePath: imagePath, customerId: customerId, layout: false,
                        user: user
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

module.exports.customerEditPost = (req, res) => {

    var files = req.files;
    var reqBody = req.body;

    var customerId = reqBody.customerId;

    if (customerId != undefined) {

        customerSchema
            .findOne({ _id: customerId })
            .exec(async function (err, results) {
                console.log('err', err);
                if (results != null) {


                    var updateCustomer = {
                        firstName: reqBody.firstName,
                        lastName: reqBody.lastName,
                        phone: reqBody.phone,
                        email: reqBody.email,
                        location: reqBody.location
                    }

                    //Logo Unlink
                    if (files != null) {

                        if (files.profileImage != undefined) {
                            var fs = require('fs');
                            var filePath = `${SERVERIMAGEUPLOADPATH}profile-pic/${results.profileImage}`;
                            fs.unlink(filePath, (err) => { });

                            var profileImage = await uploadImage(files.profileImage, 'customerprofile');

                            if (profileImage != 'error') {
                                updateCustomer.profileImage = profileImage;
                            }
                        }



                    }


                    customerSchema.updateOne({ _id: reqBody.customerId }, {
                        $set: updateCustomer
                    }, async function (err, resps) {
                        if (err) {
                            console.log('err', err);
                            req.flash('msgLog', 'Something went wrong.');
                            req.flash('msgType', 'danger');
                            res.redirect(req.headers.referer);
                            return;
                        } else {
                            if (resps.nModified == 1) {

                                req.flash('msgLog', 'Customer data updated succsessfully.');
                                req.flash('msgType', 'success');
                                res.redirect('/customer/customerList');
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


    var itemCond = {};
    if ((reqQuery.isApprove == 'false') || (reqQuery.isApprove == false)) {
        itemCond.isApprove = { $ne: true }
    }
    if (reqQuery.restaurant == 'all') {
        vendorId = 'all';

    } else {
        itemCond.vendorId = reqQuery.restaurant;
        vendorId = reqQuery.restaurant;
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

            console.log(itemResponsesArr);

            var imagePath = `${SERVERIMAGEPATH}vendor/`

            var allRestaurant = await vendorSchema.find({ isDisabled: { $ne: true } }).sort({ restaurantName: 1 });


            res.render('restaurant/unapprovedItemList.ejs', {
                itemResponsesArr: itemResponsesArr, serverImagePath: imagePath, allRestaurantArr: allRestaurant, vendorId: vendorId,
                layout: false,
                user: user,
                moment: moment
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

module.exports.customerSendPushMessage = (req, res) => {

    var user = req.session.user;

    var reqQuery = req.query;
    var customerIdArr = [];
    var vendorName = '';


    var customerCond = {
        isDeleted: { $ne: true }
    };

    customerSchema.find(customerCond)
        .then((customers) => {

            res.render('customer/customerSendPushMessage.ejs', {
                customers: customers, customerIdArr: customerIdArr, layout: false,
                user: user
            });
        })

}

module.exports.customerSendPushPost = async (req, res) => {

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



    var customerArr = [];
    if (!Array.isArray(restaurantArr)) {
        customerArr.push(restaurantArr);
    } else if (Array.isArray(restaurantArr)) {
        customerArr = restaurantArr;
    }


    if (customerArr.length > 0) {
        for (let customer of customerArr) {

            //Fetch Current Count

            var customerData = await customerSchema.findOne({ _id: customer });
            var currentCount = customerData.badgeCount;
            var newCount = Number(Number(currentCount) + 1);

            var pushMessage = pushMessage;
            var receiverId = customer;
            var pushDataset = {
                messageType: 'admin',
                badgeCount: newCount,
            };
            sendPush(receiverId, pushMessage, pushDataset);

            //ADD DATA IN NOTIFICATION TABLE
            var userNotificationData = {
                userId: receiverId,
                orderId: '',
                userType: 'CUSTOMER',
                title: notificationTitle,
                type: 'NEW',
                content: pushMessage,
                isRead: 'NO',
                automatic: 'NO'
            }

            await customerSchema.updateOne({ vendorId: receiverId }, {
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

module.exports.customerNotificationList = (req, res) => {

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
            userType: 'CUSTOMER',
            automatic: 'NO'
        }
    } else {
        var aut = 1;
        var reqNotObj = {
            userType: 'CUSTOMER',
            automatic: 'YES'
        }
    }

    UserNotificationSchema.find(reqNotObj)
        .sort({ createdAt: -1 })
        .then(async (notifications) => {

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
                    notificationObj.customer = await customerSchema.findOne({ _id: notification.userId });

                    notificationArr.push(notificationObj);
                }
            }

            if (aut == 1) {
                res.render('customer/customerAutomaticNotificationList.ejs', {
                    notificationArr: notificationArr, layout: false,
                    user: user
                });
            } else {
                res.render('customer/customerNotificationList.ejs', {
                    notificationArr: notificationArr, layout: false,
                    user: user
                });
            }

        })

}

module.exports.customerDeleteNotification = (req, res) => {

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

module.exports.customerNotificationEdit = async (req, res) => {

    var user = req.session.user;

    var reqQuery = req.query;

    var id = reqQuery.id;
    var notCond = { _id: id, userType: 'CUSTOMER' }


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
                notificationObj.customer = await customerSchema.findOne({ _id: notification.userId });


                res.render('customer/customerNotificationEdit.ejs', {
                    notificationObj: notificationObj, notificationId: id, layout: false,
                    user: user
                });

            }




        })



}

module.exports.customerNotificationEditPost = async (req, res) => {

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
            res.redirect('/customer/customerNotificationList');
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

    var vendorId = reqBody.restaurant;

    var commission = req.body.commission;

    if (req.body.sendPaymentEmail == undefined) {
        var sendPaymentEmail = 'INACTIVE'
    } else {
        var sendPaymentEmail = 'ACTIVE'
    }


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

                            req.flash('msgLog', 'Settings updated successfully.');
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

                        req.flash('msgLog', 'Settings updated successfully.');
                        req.flash('msgType', 'success');
                        res.redirect(req.headers.referer);
                        return;
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

module.exports.getLogHistory = (req, res) => {

    var customerId = req.body.customerId;

    // console.log(vendorId);

    customerLogSchema
        .find({ customerId: customerId })
        .sort({ addedTime: 'desc' })
        .then(async (customerlog) => {

            res.render('customer/ajaxLogHistory.ejs', {
                customerlog: customerlog,
                layout: false,
                moment: moment
            });
        })


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
        sampleFile.mv(`${SERVERIMAGEUPLOADPATH}profile-pic/${file_name}`, function (err) {
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
        console.log(reqBody);


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

        console.log(restaurantClose);
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
                return resolve('Something went wrong');
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
    var pushMessage = pushMessage;
    var badgeCount = orderObj.badgeCount;
    userDeviceLoginSchemaSchema
        .find({ userId: receiverId, userType: 'CUSTOMER' })
        .then(function (customers) {
            // console.log('customers',customers);
            if (customers.length > 0) {
                for (let customer of customers) {

                    var deviceToken = customer.deviceToken;

                    //  console.log('dataset',dataset);

                    if (customer.appType == 'ANDROID') {

                        //ANDROID PUSH START
                        var andPushData = {
                            'alert': pushMessage,
                            'deviceToken': deviceToken,
                            'pushMode': customer.pushMode,
                            'dataset': orderObj
                        }

                        PushLib.sendPushAndroid(andPushData)
                            .then(async function (success) { //PUSH SUCCESS

                                console.log('push_success', success);
                            }).catch(async function (err) { //PUSH FAILED

                                console.log('push_err', err);
                            });
                        //ANDROID PUSH END

                    } else if (customer.appType == 'IOS') {

                        //IOS PUSH START
                        var iosPushData = {
                            'badge': badgeCount,
                            'alert': pushMessage,
                            'deviceToken': deviceToken,
                            'pushMode': customer.pushMode,
                            'pushTo': 'CUSTOMER',
                            'dataset': orderObj
                        }
                        //SEND PUSH TO IOS [APN]

                        PushLib.sendPushIOS(iosPushData)
                            .then(async function (success) { //PUSH SUCCESS
                                console.log('push_success', success);

                            }).catch(async function (err) { //PUSH FAILED
                                console.log('push_err', err);
                            });
                        //IOS PUSH END
                    }
                }
            }
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
    console.log(day);
    console.log(dateNew);

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
