const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const mail = require('../../modules/sendEmail');
const { SERVERURL, HOST, PORT, SERVERIMAGEPATH, SERVERIMAGEUPLOADPATH } = require('../../config/bootstrap');
//Session
var session = require('express-session');

var adminModuleSchema = require('../../schema/AdminModule');
var adminSchema = require('../../schema/Admin');



module.exports.adminAdd = async (req, res) => {

    // var adminModules = [
    //     {
    //         moduleName: 'Customer',
    //         moduleSlug: 'customerList,customerChangeStatus,customerDelete'
    //     },
    //     {
    //         moduleName: 'Customer Send Push',
    //         moduleSlug: 'customerSendPushMessage'
    //     },
    //     {
    //         moduleName: 'Customer Notification',
    //         moduleSlug: 'customerNotificationList,customerDeleteNotification,customerNotificationEdit'
    //     },
    //     {
    //         moduleName: 'Order Management',
    //         moduleSlug: 'order'
    //     }

    // ]

    // adminModuleSchema.insertMany(adminModules)
    // .then(function(docs) {
    //      // do something with docs

    //      console.log(docs);
    // })

    var user = req.session.user;

    var password = randomNumber(100000, 999999);

    var adminModules = await adminModuleSchema.find({});
    res.render('subAdmin/adminAdd.ejs', {
        adminModules: adminModules,
        password: password,
        layout: false,
        user: user
    });
}
module.exports.adminAddPost = async (req, res) => {

    var reqBody = req.body;
    console.log('req.body===============', req.body);


    var fullAccessMod = reqBody.manageableModule;
    var viewAccessMod = reqBody.manageableModuleViewOnly;

    var arrayLeng = diff(fullAccessMod, viewAccessMod);

    // return;

    if (arrayLeng.length == 0) {


        if (!Array.isArray(reqBody.manageableModule)) {
            var manageableModule = [];
            manageableModule.push(reqBody.manageableModule);
        } else {
            var manageableModule = reqBody.manageableModule

        }

        if (!Array.isArray(reqBody.manageableModuleViewOnly)) {
            var manageableModuleViewOnly = [];
            manageableModuleViewOnly.push(reqBody.manageableModuleViewOnly);
        } else {
            var manageableModuleViewOnly = reqBody.manageableModuleViewOnly

        }

        var adminEmail = await adminModuleSchema.countDocuments({ email: reqBody.contactEmail });

        if (adminEmail == 0) {
            var password = reqBody.password;
            var adminAdd = {
                firstName: reqBody.firstName,
                lastName: reqBody.lastName,
                email: reqBody.contactEmail,
                phone: reqBody.contactPhone,
                countryCode: '+234',
                password: password,
                manageableModuleFullAccess: manageableModule,
                manageableModuleViewOnly: manageableModuleViewOnly,
                admintype: 'SUB_ADMIN',
                status: 'ACTIVE'
            }

            var userEmail = reqBody.contactEmail;

            var userData = {
                email: reqBody.contactEmail,
                password: password
            }
            mail('SubadminAdd')(userEmail, userData).send();

            new adminSchema(adminAdd).save(function (err, admin) {
                if (err) {
                    console.log('err', err);
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                } else {
                    req.flash('msgLog', 'Admin added successfully.');
                    req.flash('msgType', 'success');
                    res.redirect('/subAdmin/adminList');
                    return;

                }
            })
        } else {

            req.flash('msgLog', 'Email already exist.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        }
    } else {
        console.log('msgLog', 'A module is either get full access or view only access.');
        req.flash('msgLog', 'A module is either get full access or view only access.');
        req.flash('msgType', 'danger');
        res.redirect(req.headers.referer);
        return;
    }



}

module.exports.adminEdit = async (req, res) => {

    var user = req.session.user;

    var adminId = req.query.id;
    var responseDt = {};

    if (adminId != undefined) {


        adminSchema
            .findOne({ _id: adminId })
            .then(async function (subAdmin) {

                if (subAdmin != null) {

                    // console.log(results);
                    // return;

                    var adminModules = await adminModuleSchema.find({});


                    res.render('subAdmin/adminEdit.ejs', {
                        adminModules: adminModules, subAdmin: subAdmin, adminId: adminId,
                        layout: false,
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
module.exports.adminEditPost = async (req, res) => {

    var reqBody = req.body;


    var adminId = reqBody.adminId;

    console.log(reqBody);
    //return;

    var fullAccessMod = reqBody.manageableModule;
    var viewAccessMod = reqBody.manageableModuleViewOnly;

    var arrayLeng = diff(fullAccessMod, viewAccessMod);

    if (arrayLeng.length == 0) {

        if (!Array.isArray(reqBody.manageableModule)) {
            var manageableModule = [];
            manageableModule.push(reqBody.manageableModule);
        } else {
            var manageableModule = reqBody.manageableModule

        }

        if (!Array.isArray(reqBody.manageableModuleViewOnly)) {
            var manageableModuleViewOnly = [];
            manageableModuleViewOnly.push(reqBody.manageableModuleViewOnly);
        } else {
            var manageableModuleViewOnly = reqBody.manageableModuleViewOnly

        }


        var adminEdit = {
            firstName: reqBody.firstName,
            lastName: reqBody.lastName,
            email: reqBody.contactEmail,
            phone: reqBody.contactPhone,
            manageableModuleFullAccess: manageableModule,
            manageableModuleViewOnly: manageableModuleViewOnly
        }

        if (reqBody.password != '') {
            adminEdit.password = await bcrypt.hash(reqBody.password, 8);
            var userEmail = reqBody.contactEmail;

            var userData = {
                email: reqBody.contactEmail,
                password: reqBody.password
            }
            mail('SubadminAdd')(userEmail, userData).send();
        }

        adminSchema.updateOne({ _id: adminId }, {
            $set: adminEdit
        }, function (err, resp) {
            if (err) {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            } else {
                if (resp.nModified == 1) {
                    req.flash('msgLog', 'Sub admin updated successfully.');
                    req.flash('msgType', 'success');
                    res.redirect('/subAdmin/adminList');
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
        req.flash('msgLog', 'A module is either get full access or view only access.');
        req.flash('msgType', 'danger');
        res.redirect(req.headers.referer);
        return;
    }
}

module.exports.adminList = (req, res) => {

    var user = req.session.user;

    adminSchema.find({ admintype: 'SUB_ADMIN' })
        .sort({ createdAt: -1 })
        .then(async (admins) => {

            res.render('subAdmin/adminList.ejs', {
                admins: admins,
                layout: false,
                user: user
            });
        });
}

module.exports.changeStatus = (req, res) => {

    var adminId = req.query.id;
    var adminStatus = req.query.status;
    if (adminId != undefined) {

        if (adminStatus == 'Active') {
            var isActive = 'INACTIVE'
        } else {
            var isActive = 'ACTIVE'
        }


        adminSchema.updateOne({ _id: adminId }, {
            $set: {
                status: isActive
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

module.exports.adminDelete = (req, res) => {

    var id = req.query.id;
    if (id != undefined) {

        adminSchema
            .findOne({ _id: id })
            .then(async (bannerGet) => {

                adminSchema.deleteOne({ _id: id }, function (err) {
                    if (err) {
                        req.flash('msgLog', 'Something went wrong.');
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    } else {

                        req.flash('msgLog', 'Admin deleted successfully.');
                        req.flash('msgType', 'success');
                        res.redirect('/subAdmin/adminList');
                        return;

                    }
                });


            });
    }
}

function randomNumber(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function diff(arr, arr2) {

    if (!Array.isArray(arr)) {
        var arrOne = [];
        arrOne.push(arr);
    } else {
        var arrOne = arr

    }

    if (!Array.isArray(arr2)) {
        var arr2One = [];
        arr2One.push(arr2);
    } else {
        var arr2One = arr2

    }

    var ret = [];
    arrOne.sort();
    arr2One.sort();
    for (var i = 0; i < arrOne.length; i += 1) {
        if (arr2One.indexOf(arrOne[i]) > -1) {
            ret.push(arrOne[i]);
        }
    }
    return ret;

}


