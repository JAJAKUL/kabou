const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const mail = require('../../modules/sendEmail');
//Session
var session = require('express-session');

var itemSchema = require('../../schema/Item');
var vendorSchema = require('../../schema/Vendor');
var vendorAccountSchema = require('../../schema/VendorAccount');
var customerSchema = require('../../schema/Customer');
var adminNotificationSchema = require('../../schema/AdminNotification');

module.exports.home = (req, res) => {
    res.render('index',{title : 'Food Delivery'});
}

module.exports.dashboard = async (req, res) => {
    var user = req.session.user;

//     var store = require('app-store-scraper');
 
// store.app({appId: 'com.kabou.Restaurant'}).then(console.log).catch(console.log);

// //     var gplay = require('google-play-scraper');
 
// // gplay.app({appId: 'com.kabou.Restaurant'})
// //   .then(console.log, console.log);

//   return;


        var responseObj = {};

        var itemUnapproved = await itemSchema.countDocuments({isApprove: { $ne: true }});
        responseObj.itemUnapproved = itemUnapproved;


        var allVendor = await vendorSchema.countDocuments({});
        responseObj.allVendor = allVendor;

        var allVendorActive = await vendorSchema.countDocuments({ isActive: true });
        responseObj.allVendorActive = allVendorActive;

        var allVendorInactive = await vendorSchema.countDocuments({ isActive: false });
        responseObj.allVendorInactive = allVendorInactive;

        var allAccountInactive = await vendorAccountSchema.countDocuments({ isActive: false });
        responseObj.allAccountInactive = allAccountInactive;

        var allCustomers = await customerSchema.countDocuments({});
        responseObj.allCustomers = allCustomers;

        var allCustomersActive = await customerSchema.countDocuments({status: 'ACTIVE'});
        responseObj.allCustomersActive = allCustomersActive;

        var allCustomersInactive = await customerSchema.countDocuments({status: 'INACTIVE'});
        responseObj.allCustomersInactive = allCustomersInactive;

        res.render('dashboard/home.ejs', { responseObj: responseObj,
            layout:false,
            user: user });
    


}

module.exports.noAccess = async (req, res) => {
    var user = req.session.user;

    console.log(req.headers.referer);

        res.render('dashboard/noAccess.ejs', { responseObj: req.headers.referer,
            layout:false,
            user: user });
    


}

module.exports.getNotification = async (req, res) => {


    var adminUnreadNot = await adminNotificationSchema.countDocuments({isRead: 'NO'});
    
    if(adminUnreadNot == 0) {
        adminUnreadNot = '';
    }
    res.status(200).json({notification: adminUnreadNot})


}


module.exports.adminNotificationList = (req, res) => {

    var user = req.session.user;

    var reqQuery = req.query.automatic;


    // UserNotificationSchema.updateMany({ orderId:'' }, {
    //     $set: {automatic: 'NO'}
    // }, function (err, resp) {
    //     console.log(err);
    //     console.log(resp);
    // });



    adminNotificationSchema.find({})
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
                        createdAt: listNotDateFormat(notification.createdAt),
                        notificationType: notification.notificationType,
                        notificationTypeId: notification.notificationTypeId,
                        isRead: notification.isRead,

                    }
                    notificationArr.push(notificationObj);
                }
            }

            res.render('dashboard/adminNotificationList.ejs', {
                notificationArr: notificationArr, layout: false,
                user: user
            });

        })

}


module.exports.adminDeleteNotification = (req, res) => {

    var notificationId = req.query.id;
    if (notificationId != undefined) {

        adminNotificationSchema
            .findOne({ _id: notificationId })
            .then(async (notGet) => {

                if (notGet != null) {

                    adminNotificationSchema.deleteOne({ _id: notificationId }, function (err) {
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

module.exports.updateNotification = (req, res) => {

    var notificationId = req.body.notId;

    adminNotificationSchema.updateOne({ _id: notificationId }, {
        $set: {isRead: 'YES'}
    }, function (err, resp) {
        if (err) {
            console.log('err', err);
            var responseObj = { msg: 'Something went wrong.' };
            res.status(500).json(responseObj)
        } else {
            if (resp.nModified == 1) {

                var responseObj = { msg: 'Notification Read.' };
                res.status(200).json(responseObj)
            }
        }
    });
    
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