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
var itemSchema = require('../../schema/Item');
var customerSchema = require('../../schema/Customer');
var autoNotificationSchema = require('../../schema/UserNotification');
var orderRefundSchema = require('../../schema/OrderRefund');
var userNotificationSettingSchema = require('../../schema/UserNotificationSetting');
var userDeviceLoginSchemaSchema = require('../../schema/UserDeviceLogin');
var UserNotificationSchema = require('../../schema/UserNotification');
var vendorOwnerSchema = require('../../schema/VendorOwner');
var PushLib = require('../../libraries/pushlib/send-push');



module.exports.orderList = (req, res) => {
    var user = req.session.user;
    var status = 'ALL'
    var vendorId = ''
    var customerId = ''
    var orderObj = {};


    var toDateNw = new Date();
    var fromDateNw = new Date();
    fromDateNw.setDate(fromDateNw.getDate() - 10);


    var fromDate = req.query.from;
    var toDate = req.query.to;

    if (fromDate == undefined) {
        fromDate = listDateFilter(fromDateNw);
    } else {
        fromDateNw = createDateFormat(fromDate, 1)

    }

    if (toDate == undefined) {
        toDate = listDateFilter(toDateNw);
    } else {
        toDateNw = createDateFormat(toDate, 2)
    }

    orderObj.createdAt = { $gte: fromDateNw, $lte: toDateNw }





    // orderObj.createdAt = {$gte:today};

    var reqQueryStatus = req.query.status;
    if ((reqQueryStatus != undefined) && (reqQueryStatus != 'all')) {
        status = reqQueryStatus;
        orderObj.orderStatus = reqQueryStatus;
    }

    var reqQueryRestaurant = req.query.restaurant;
    if ((reqQueryRestaurant != undefined) && (reqQueryRestaurant != '') && (reqQueryRestaurant != 'all')) {
        var reqQueryRestaurant = reqQueryRestaurant.split(",");
        vendorId = reqQueryRestaurant;
        orderObj.vendorId = reqQueryRestaurant;
    }

    var reqQueryCustomer = req.query.customer;
    if ((reqQueryCustomer != undefined) && (reqQueryCustomer != '') && (reqQueryCustomer != 'all')) {
        customerId = reqQueryCustomer;
        orderObj.customerId = reqQueryCustomer;
    }

    var datasearch = req.query.search;
    var dataTxt = '';
    if ((datasearch != undefined) && (datasearch != '') && (datasearch != 'all')) {
        var orderObj = {};
        orderObj.orderNo = { '$regex': datasearch, '$options': 'i' };

        dataTxt = datasearch;
    }

    


    orderSchema.find(orderObj)
        .populate('orderDetails')
        .sort({ createdAt: -1 })
        .then(async (orders) => {
            var orderArr = [];
            if (orders.length > 0) {
                for (let order of orders) {
                    var orderObj = {
                        _id: order._id,
                        paymentType: order.paymentType,
                        orderNo: order.orderNo,
                        price: order.price,
                        discount: order.discount,
                        finalPrice: order.finalPrice,
                        deliveryPreference: order.deliveryPreference,
                        orderStatus: order.orderStatus,
                        promoCode: order.promoCode,
                        orderTime: listDateFormat(order.orderTime),
                    };

                    if (order.userType == 'GUEST') {
                        orderObj.name = order.guestName;
                        orderObj.email = order.guestEmail;
                        orderObj.countryCode = order.guestCountryCode;
                        orderObj.phone = order.guestPhone;
                    } else {
                        var customerObj = await customerSchema.findOne({ _id: order.customerId });

                        console.log(customerObj);

                        if (customerObj != null) {
                            orderObj.name = `${customerObj.firstName} ${customerObj.lastName}`;
                            orderObj.email = customerObj.email;
                            orderObj.countryCode = customerObj.countryCode;
                            orderObj.phone = customerObj.phone;
                        } else {
                            orderObj.name = '';
                            orderObj.email = '';
                            orderObj.countryCode = '';
                            orderObj.phone = '';
                        }
                    }

                    orderObj.restaurant = await vendorSchema.findOne({ _id: order.vendorId });
                    orderObj.orderDetails = order.orderDetails;
                    orderArr.push(orderObj);
                }
            }

            var vendors = await vendorSchema.find({ isDisabled: { $ne: true } });

            res.render('order/orderList.ejs', {
                orderArr: orderArr,
                layout: false,
                user: user,
                status: status,
                vendors: vendors,
                vendorId: vendorId,
                customerId: customerId,
                fromDate: fromDate,
                toDate: toDate,
                dataTxt: dataTxt
            });
        });
}

module.exports.orderDetails = (req, res) => {
    var user = req.session.user;

    var orderObj = {};

    var reqQueryOrder = req.query.orderId;
    if ((reqQueryOrder != undefined) && (reqQueryOrder != '') && (reqQueryOrder != 'all')) {
        orderObj._id = reqQueryOrder;
    }

    orderSchema
        .findOne(orderObj)
        .populate('orderDetails')
        .then(async function (order) {
            //  console.log(order);

            var orderResp = {};

            orderResp._id = order._id;
            orderResp.orderNo = order.orderNo;
            orderResp.orderTime = listDateFormat(order.orderTime);
            orderResp.finalPrice = order.finalPrice;
            orderResp.price = order.price;
            orderResp.discount = order.discount;
            orderResp.estimatedDeliveryTime = timeConvert(order.estimatedDeliveryTime);
            orderResp.orderStatus = order.orderStatus;
            orderResp.specialInstruction = order.specialInstruction;
            orderResp.appliedPromocode = order.promocodeId;
            orderResp.paymentMode = order.paymentType;
            orderResp.vendorId = order.vendorId;
            orderResp.deliveryFullAddress = order.deliveryFullAddress;
            orderResp.deliveryPhone = order.deliveryPhone;

            //Payment
            var paymentDetails = await paymentSchema.findOne({ orderId: order._id });

            if (paymentDetails != null) {
                orderResp.paymentDetails = await getPaymentDetails(paymentDetails, order.paymentType);
            } else {
                orderResp.paymentDetails = '';
            }

            //Options & Extra


            var orderDetails = order.orderDetails;
            var orderExtraArr = [];
            if (orderDetails.length > 0) {
                for (let details of orderDetails) {
                    var orderExtraObj = {
                        orderId: details.orderId,
                        offerId: details.offerId,
                        itemId: details.itemId,
                        item: details.item,
                        quantity: details.quantity,
                        itemPrice: details.itemPrice,
                        totalPrice: details.totalPrice,
                        createdAt: details.createdAt,
                        updatedAt: details.updatedAt,
                        __v: details.__v,
                        itemOptions: details.itemOptions,
                        orderExtras: details.itemExtras
                    };

                    var itemObj = await itemSchema.findOne({ _id: details.itemId });

                    if (itemObj != null) {
                        orderExtraObj.image = `${SERVERIMAGEPATH}/vendor/${itemObj.menuImage}`;
                    } else {
                        orderExtraObj.image = `${SERVERIMAGEPATH}/vendor/`;
                    }

                    orderExtraArr.push(orderExtraObj);
                }
            }
            orderResp.orderDetails = orderExtraArr;
            //Vendor Info
            var vendorInfo = await vendorSchema.findOne({ _id: order.vendorId });
            orderResp.restaurantName = vendorInfo.restaurantName;
            orderResp.address = vendorInfo.address;
            orderResp.restaurantImage = `${SERVERIMAGEPATH}`;
            orderResp.logo = `${SERVERIMAGEPATH}`;

            if (order.userType == 'GUEST') {
                orderResp.customerName = order.guestName;
            } else {
                //Vendor Info
                var customerInfo = await customerSchema.findOne({ _id: order.customerId });
                orderResp.customerName = `${customerInfo.firstName} ${customerInfo.lastName}`;
            }

            res.render('order/orderDetails.ejs', {
                orderResp: orderResp,
                layout: false,
                user: user
            });



        })
        .catch(function (err) {
            console.log(err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;

        });
}


module.exports.fetchOrderDetails = (req, res) => {


    var itemId = req.body.itemId;
    if (itemId != undefined) {



        orderDetailsSchema.findOne({ orderId: itemId })
            .then(async (order) => {

                var itemsObj = {}

                itemsObj.itemOptions = order.itemOptions;
                itemsObj.itemExtras = order.itemExtras;

                var responseObj = {
                    msg: 'Order detaiis.',
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

module.exports.cancelOrder = async (req, resp) => {

    var orderId = req.body.orderId;
    if (orderId != undefined) {

        orderSchema
            .findOne({ _id: orderId })
            .then(async function (res) {
                // console.log('res',res);
                if (res != null) {

                    var refundPaymentRes = await refundPayment(res);

                    // console.log(refundPaymentRes);
                    // return;

                    if (refundPaymentRes == 'success') {


                        orderSchema.updateOne({ _id: orderId }, {
                            $set: { orderStatus: 'CANCELLED', orderStatusChangeTime: new Date(), orderCancelReason: 'Admin cancelled' }
                        }, async function (err, orderRes) {
                            if (err) {
                                console.log(err);

                                var responseObj = { msg: 'Something went wrong.', statusCode: 422 };
                                resp.status(200).json(responseObj);
                            } else {
                                if (orderRes.nModified == 1) {

                                    //SEND PUSH MESSAGE TO CUSTOMER
                                    if (res.userType == 'CUSTOMER') {
                                        //AUTO NOTIFICATION
                                        var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Cancel order', userType: 'CUSTOMER' });
                                        if (autoNotificationFetch != null) {
                                            var pushMessage = autoNotificationFetch.content;
                                        } else {
                                            var pushMessage = 'You order has been cancelled successfully'
                                        }
                                        var pushMsg = pushMessage
                                        var title = 'Cancel order'
                                        //NOTIFICATION SETTINGS CHECK
                                       
                                        var checkNotSettings = await checkNotificationSettings(res.customerId, 'OrderStatusNotification');

                                        console.log('-----------------------1-----------------------');
                                        sendOrderPush(res, pushMsg, title, checkNotSettings);
                                        console.log('-----------------------2-----------------------');

                                    }

                                    //SEND PUSH MESSAGE TO VENDOR

                                    //NOTIFICATION SETTINGS CHECK
                                    var checkNotSettings = await checkNotificationSettingsVendor(res.vendorId, 'OrderCancellation');
                                    console.log('-----------------------3-----------------------');
                                    //Fetch Current Count
                                    var vendorOwnerData = await vendorOwnerSchema.findOne({ vendorId: res.vendorId });
                                    var currentCount = vendorOwnerData.badgeCount;
                                    var newCount = Number(Number(currentCount) + 1);

                                    //AUTO NOTIFICATION
                                    var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Cancel order', userType: 'VENDOR' });
                                    if (autoNotificationFetch != null) {
                                        var pushMessage = autoNotificationFetch.content;
                                    } else {
                                        var pushMessage = 'Order has been cancelled'
                                    }

                                    var receiverId = res.vendorId;
                                    var pushDataset = {
                                        orderNo: res.orderNo,
                                        title: 'Cancel order',
                                        type: 'CANCEL',
                                        orderId: orderId,
                                        badgeCount: newCount,
                                        messageType: 'order'
                                    }

                                    if (checkNotSettings == true) {
                                        sendPushVendor(receiverId, pushMessage, pushDataset);
                                    }
                                    console.log('-----------------------4-----------------------');
                                    //ADD DATA IN NOTIFICATION TABLE
                                    var userNotificationData = {
                                        userId: receiverId,
                                        orderId: orderId,
                                        userType: 'VENDOR',
                                        title: 'Cancel order',
                                        type: 'CANCEL',
                                        content: pushMessage,
                                        isRead: 'NO',
                                        automatic: 'YES'
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



                                    var responseObj = { msg: 'Order cancelled successfully.', statusCode: 200 };
                                    resp.status(200).json(responseObj);
                                } else {
                                    var responseObj = { msg: 'Something went wrong.', statusCode: 422 };
                                    resp.status(200).json(responseObj);
                                }
                            }
                        });





                    } else {

                        console.log(refundPaymentRes);

                        var responseObj = { msg: 'Refund unsuccessful' };
                        resp.status(200).json(responseObj);

                    }


                }

            });

    } else {

    }
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


function getPaymentDetails(payment, paymentMode) {

    return new Promise(async function (resolve, reject) {

        if ((paymentMode != 'CARD') && (paymentMode != 'USSD') && (paymentMode != 'BANK_TRANSFER')) {
            return resolve('');
        } else {
            var reference = payment.customerPaymentReference;

            payment.customerPaymentDetails = '';
            if (payment.customerPaymentDetails != '') {
                var paymentRes = payment.customerPaymentDetails;

                if (paymentMode == 'CARD') {
                    var resp = `XXXX XXXX XXXX ${paymentRes.last4}`;

                    return resolve(resp);
                } else if (paymentMode == 'USSD') {
                    var resp = `${payment.authorization.bank}`;

                    return resolve(resp);
                } else if (paymentMode == 'BANK_TRANSFER') {
                    var resp = `${payment.authorization.bank}`;

                    return resolve(resp);
                }



            } else {
                return resolve('');
            }
        }




    });
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


function createDateFormat(reqDate, type) {
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

function refundPayment(order) {
    return new Promise(async function (resolve, reject) {
        var orderId = order._id;
        orderRefundSchema.findOne({ orderId: orderId })
            .then(async (refundCheck) => {

                if (refundCheck == null) {
                    paymentSchema.findOne({ orderId: orderId })
                        .then(async (payment) => {
                            if (payment != null) {

                                var paymentReference = payment.customerPaymentReference;
                                var scrtKey = `Bearer ${PAYSTACK_SK}`;

                                const https = require('https')
                                const params = JSON.stringify({
                                    "transaction": paymentReference
                                })
                                const options = {
                                    hostname: 'api.paystack.co',
                                    port: 443,
                                    path: '/refund',
                                    method: 'POST',
                                    headers: {
                                        Authorization: scrtKey,
                                        'Content-Type': 'application/json'
                                    }
                                }
                                const req = https.request(options, resp => {
                                    let data = ''
                                    resp.on('data', (chunk) => {
                                        data += chunk
                                    });
                                    resp.on('end', () => {
                                        console.log(JSON.parse(data));

                                        var transferReceipt = JSON.parse(data);

                                        if (transferReceipt.status == true) {

                                            var transactionTime = transferReceipt.data.paid_at;
                                            var totalAmount = transferReceipt.data.transaction.amount;
                                            var paymentReference = transferReceipt.data.reference;

                                            var paymentRefundObj = {
                                                orderId: orderId,
                                                totalAmount: totalAmount,
                                                paymentReference: paymentReference,
                                                paymentTime: transactionTime
                                            }

                                            new orderRefundSchema(paymentRefundObj).save(async function (err, orderRefundResult) {
                                                if (err) {
                                                    console.log('err', err);
                                                    return resolve('success');

                                                } else {
                                                    console.log('orderRefundResult', orderRefundResult);
                                                    return resolve('success');
                                                }
                                            });

                                        } else {
                                            return resolve(`${transferReceipt.message}`);
                                        }
                                    })
                                }).on('error', error => {
                                    console.error(error);
                                    return resolve('Something went wrong.');
                                })
                                req.write(params)
                                req.end()

                            } else {
                                return resolve('success');
                            }
                        })
                        .catch((err) => {
                            console.log('err', err);
                            return resolve('Something went wrong.');
                        })
                }

            })
            .catch((err) => {
                console.log('err', err);
                return resolve('Something went wrong.');
            })

    });
}

function checkNotificationSettings(userId, notType) {
    return new Promise(function (resolve, reject) {

        userNotificationSettingSchema.findOne({ userId: userId, userType: 'CUSTOMER' })
            .then(async (notSetting) => {
                if (notSetting != null) {
                    if (notType == 'OrderStatusNotification') {
                        if (notSetting.notificationData.OrderStatusNotification == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'PromotionalNotification') {
                        if (notSetting.notificationData.PromotionalNotification == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'RestaurantOfferNotification') {
                        if (notSetting.notificationData.RestaurantOfferNotification == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'RestaurantOrderConfirmation') {
                        if (notSetting.notificationData.RestaurantOrderConfirmation == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'RestaurantOrderReady') {
                        if (notSetting.notificationData.RestaurantOrderReady == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'RestaurantOrderDelivered') {
                        if (notSetting.notificationData.RestaurantOrderDelivered == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else {
                        return resolve(true);
                    }


                } else {
                    return resolve(true);
                }

            })
            .catch((error) => {
                return resolve(false);
            })

    });
}

function checkNotificationSettingsVendor(userId, notType) {
    return new Promise(function (resolve, reject) {

        userNotificationSettingSchema.findOne({ userId: userId, userType: 'VENDOR' })
            .then(async (notSetting) => {
                if (notSetting != null) {
                    if (notType == 'NewOrder') {
                        if (notSetting.notificationData.NewOrder == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'PreOrder') {
                        if (notSetting.notificationData.PreOrder == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'OrderNotification') {
                        if (notSetting.notificationData.OrderNotification == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'OrderModification') {
                        if (notSetting.notificationData.OrderModification == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'OrderCancellation') {
                        if (notSetting.notificationData.OrderCancellation == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else {
                        return resolve(true);
                    }


                } else {
                    return resolve(true);
                }

            })
            .catch((error) => {
                return resolve(false);
            })

    });
}

async function sendOrderPush(order, pushMsg, title, checkNotSettings) {
    return new Promise(async function (resolve, reject) {
        var customerData = await customerSchema.findOne({ _id: order.customerId });
        var currentCount = customerData.badgeCount;
        var newCount = Number(Number(currentCount) + 1);

        var pushMessage = pushMsg

        var receiverId = order.customerId;
        var orderId = order._id;

        //Fetch Vendor name
        var vendorInfo = await vendorSchema.findOne({ _id: order.vendorId });
        var vendorName = vendorInfo.restaurantName;

        var pushDataset = {
            orderNo: order.orderNo,
            title: title,
            type: title,
            orderId: order._id,
            badgeCount: newCount,
            messageType: 'order',
            restaurantName: vendorName
            // orderStatus: orderChangeRes
        }

        if (checkNotSettings == true) {
            sendPush(receiverId, pushMessage, pushDataset);
        }

        //ADD DATA IN NOTIFICATION TABLE
        var userNotificationData = {
            userId: receiverId,
            orderId: orderId,
            userType: 'CUSTOMER',
            title: title,
            type: title,
            content: pushMessage,
            isRead: 'NO',
            automatic: 'YES'
        }

        await customerSchema.updateOne({ _id: receiverId }, {
            $set: {
                badgeCount: newCount
            }
        });
        new UserNotificationSchema(userNotificationData).save(async function (err, resultNt) {
            console.log('err', err);
            console.log('result', resultNt);
        });

        return resolve();

    });

}

function sendPush(receiverId, pushMessage, orderObj) {
    console.log('----PUSH START-----')
    var pushMessage = pushMessage;
    var badgeCount = orderObj.badgeCount;
    userDeviceLoginSchemaSchema
        .find({ userId: receiverId, userType: 'CUSTOMER' })
        .then(function (customers) {
            // console.log('customers',customers);
            if (customers.length > 0) {
                for (let customer of customers) {

                    // var msgStr = ",";
                    // msgStr += "~order_no~:~" + orderNo + "~";
                    // msgStr += "~order_status~:~" + orderStatus + "~";
                    // msgStr += "~restaurant_name~:~" + vendorName + "~";
                    // var dataset = "{~message~:~" + pushMessage + "~" + msgStr + "}";

                    var deviceToken = customer.deviceToken;

                    //  console.log('dataset',dataset);

                    if (customer.appType == 'ANDROID') {

                        //ANDROID PUSH START
                        var andPushData = {
                            'badge': badgeCount,
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


function sendPushVendor(receiverId, pushMessage, orderObj) {
    // console.log(receiverId);
    var pushMessage = pushMessage;
    var orderNo = orderObj.orderNo;
    var badgeCount = orderObj.badgeCount;
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
                                        'badge': badgeCount,
                                        'alert': pushMessage,
                                        'deviceToken': deviceToken,
                                        'pushMode': customer.pushMode,
                                        'dataset': orderObj
                                    }
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
                                        'badge': badgeCount,
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


