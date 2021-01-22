const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const mail = require('../../modules/sendEmail');
const { SERVERURL, HOST, PORT, SERVERIMAGEPATH, SERVERIMAGEUPLOADPATH, PAYSTACK_SK } = require('../../config/bootstrap');
//Session
var session = require('express-session');

var vendorSchema = require('../../schema/Vendor');
var paymentSchema = require('../../schema/Payment');
var orderSchema = require('../../schema/Order');
var orderDetailsSchema = require('../../schema/OrderDetail');
var customerSchema = require('../../schema/Customer');
var orderReviewSchema = require('../../schema/OrderReview');



module.exports.reviewList = (req, res) => {
    var user = req.session.user;
    var status = 'ALL'
    var vendorId = ''
    var customerId = ''

    var today = new Date();
    today.setDate(today.getDate() - 40);



    var orderObj = {};


    var reqQueryRestaurant = req.query.restaurant;
    if ((reqQueryRestaurant != undefined) && (reqQueryRestaurant != '') && (reqQueryRestaurant != 'all')) {
        vendorId = reqQueryRestaurant;
        orderObj.vendorId = reqQueryRestaurant;
    }

    var reqQueryCustomer = req.query.customer;
    if ((reqQueryCustomer != undefined) && (reqQueryCustomer != '') && (reqQueryCustomer != 'all')) {
        customerId = reqQueryCustomer;
        orderObj.customerId = reqQueryCustomer;
    }


    orderReviewSchema.find(orderObj)
        .sort({ createdAt: -1 })
        .then(async (orderReviews) => {

            var reviewArr = [];
            if (orderReviews.length > 0) {
                for (let orderReview of orderReviews) {
                    var orderObj = {
                        customerName: orderReview.customerName,
                        comment: orderReview.comment,
                        customerRating: orderReview.customerRating,
                        reviewTime: listDateFormat(orderReview.createdAt),
                        _id: orderReview._id
                    };

                    var orders = await orderSchema.findOne({ _id: orderReview.orderId });

                    orderObj.order = orders;
                    // orderObj.customer = await customerSchema.findOne({ _id: orderReview.customerId });
                    orderObj.restaurant = await vendorSchema.findOne({ _id: orderReview.vendorId });

                    reviewArr.push(orderObj);
                }
            }

            var vendors = await vendorSchema.find({ isDisabled: { $ne: true } });


            res.render('review/reviewList.ejs', {
                reviewArr: reviewArr,
                layout: false,
                user: user,
                status: status,
                vendors: vendors,
                vendorId: vendorId,
                customerId: customerId
            });
        });
}

module.exports.reviewDelete = (req, res) => {
    var user = req.session.user;


    var reviewId = req.query.id;

    orderReviewSchema.findOne({ _id: reviewId })
        .sort({ createdAt: -1 })
        .then(async (orderReviews) => {

            if (orderReviews != null) {

                orderReviewSchema.deleteOne({ _id: reviewId }, function (err) {
                    if (err) {
                        req.flash('msgLog', 'Something went wrong.');
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    } else {

                        req.flash('msgLog', 'Review deleted successfully.');
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

module.exports.reviewEdit = (req, res) => {
    var user = req.session.user;


    var reviewId = req.query.id;


    orderReviewSchema.findOne({ _id: reviewId })
        .sort({ createdAt: -1 })
        .then(async (orderReview) => {
            if (orderReview != null) {


                var orderObj = {
                    customerName: orderReview.customerName,
                    comment: orderReview.comment,
                    customerRating: orderReview.customerRating,
                    reviewTime: listDateFormat(orderReview.createdAt),
                    _id: orderReview._id
                };

                var orders = await orderSchema.findOne({ _id: orderReview.orderId });

                orderObj.order = orders;
                // orderObj.customer = await customerSchema.findOne({ _id: orderReview.customerId });
                orderObj.restaurant = await vendorSchema.findOne({ _id: orderReview.vendorId });


                res.render('review/reviewEdit.ejs', {
                    review: orderObj,
                    layout: false,
                    user: user,
                    reviewId: reviewId
                });

            } else {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            }
        });
}

module.exports.reviewEditPost = (req, res) => {
    var user = req.session.user;


    var reqBody = req.body;


    var reviewId = reqBody.reviewId;

    // console.log(reqBody);
    // return;

    orderReviewSchema
        .findOne({ _id: reviewId })
        .then(async (reviewGet) => {

            if (reviewGet != null) {

                var customerComment = {
                    customer: reqBody.commentCustomer,
                    restaurant: reqBody.commentRestaurant
                }

                var insertReview = {
                    comment: customerComment,
                }

                orderReviewSchema.updateOne({ _id: reviewId }, {
                    $set: insertReview
                }, async function (err, result) {
                    if (err) {
                        console.log(err);
                        req.flash('msgLog', 'Something went wrong.');
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    } else {
                        req.flash('msgLog', 'Review updated successfully.');
                        req.flash('msgType', 'success');
                        res.redirect(`/review/reviewList?restaurant=${reviewGet.vendorId}`);
                        return;
                    }
                });


            } else {

                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            }

        })
        .catch((err) => {
            console.log('err', err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        })



}


function listDateFormat(date) {
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



