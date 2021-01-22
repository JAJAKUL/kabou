var vendorSchema = require('../../schema/Vendor');
var vendorFavouriteSchema = require('../../schema/VendorFavourite');
var categorySchema = require('../../schema/Category');
var bannerSchema = require('../../schema/Banner');
var itemSchema = require('../../schema/Item');
var userDeviceLoginSchemaSchema = require('../../schema/UserDeviceLogin');
var promoCodeSchema = require('../../schema/PromoCode');
var paymentSchema = require('../../schema/Payment');

var orderSchema = require('../../schema/Order');
var OrderReviewSchema = require('../../schema/OrderReview');
var orderRefundSchema = require('../../schema/OrderRefund');
var vendorOwnerSchema = require('../../schema/VendorOwner');
var userNotificationSettingSchema = require('../../schema/UserNotificationSetting');
var UserNotificationSchema = require('../../schema/UserNotification');
var autoNotificationSchema = require('../../schema/AutoNotification');
var customerlogSchema = require('../../schema/CustomerLog');
var customerSchema = require('../../schema/Customer');
var config = require('../../config');
var PushLib = require('../../libraries/pushlib/send-push');
const { image } = require('image-downloader');

module.exports = {
    //Customer Order List API
    orderList: (data, callBack) => {
        if (data) {
            console.log(data.body);
            var userType = data.body.userType;
            var customerId = data.body.customerId;
            var orderStatus = data.body.orderStatus;
            var responseOrder = {};

            if (userType == 'GUEST') {
                var findCond = { guestEmail: customerId };
            } else {
                var findCond = { customerId: customerId };
            }

            if (orderStatus == 'ONGOING') {
                var orCond = [{ 'orderStatus': 'NEW' }, { 'orderStatus': 'ACCEPTED' }, { 'orderStatus': 'DELAYED' }, { 'orderStatus': 'COLLECTED' }, { 'orderStatus': 'MODIFIED' }, { 'orderStatus': 'READY' }]
            } else {
                var orCond = [{ 'orderStatus': 'COMPLETED' }, { 'orderStatus': 'CANCELLED' }]
            }

            orderSchema
                .find(findCond)
                .or(orCond)
                .sort({ orderTime: 'desc' })
                .populate('orderDetails')
                .then(async function (orders) {
                    var allorders = [];
                    if (orders.length > 0) {
                        for (let order of orders) {
                            var orderlst = {};
                            orderlst.orderId = order._id;
                            orderlst.orderNo = order.orderNo;
                            orderlst.finalPrice = order.finalPrice;
                            orderlst.estimatedDeliveryTime = order.estimatedDeliveryTime;
                            orderlst.orderStatus = order.orderStatus;
                            orderlst.orderTime = order.orderTime;
                            orderlst.vendorId = order.vendorId;

                            //Vendor Info
                            var vendorInfo = await vendorSchema.findOne({ _id: order.vendorId });
                            orderlst.restaurantName = vendorInfo.restaurantName;
                            orderlst.description = vendorInfo.description;
                            orderlst.restaurantImage = `${config.serverhost}:${config.port}/img/vendor/${vendorInfo.banner}`;
                            orderlst.logo = `${config.serverhost}:${config.port}/img/vendor/${vendorInfo.logo}`;

                            //Order Review
                            var OrderReviewCheck = await OrderReviewSchema.findOne({ customerId: customerId, orderId: order._id });
                            if (OrderReviewCheck == null) {
                                orderlst.userReviewStatus = 'NO'
                            } else {
                                orderlst.userReviewStatus = 'YES'
                            }
                            allorders.push(orderlst);
                        }
                    }
                    responseOrder.orderList = allorders;
                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'order list.',
                        response_data: responseOrder
                    })

                })
                .catch(function (err) {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Something went wrong.',
                        response_data: {}
                    })
                })
        }
    },
    //Customer Order Details API
    orderDetails: (data, callBack) => {
        if (data) {
            var orderId = data.body.orderId;
            var responseOrder = {};

            orderSchema
                .findOne({ _id: orderId })
                .populate('orderDetails')
                .then(async function (order) {
                    // console.log(order);

                    if (order.orderStatus != 'NEW') {
                        var acceptedOrderTime = order.orderAcceptedTime;

                        var estimatedDeliveryTime = order.estimatedDeliveryTime;
                        var date2 = new Date();

                        // To calculate the time difference of two dates 
                        var Difference_In_Time = Number(date2.getTime()) - Number(acceptedOrderTime.getTime());

                        var differenceTimeMinutes = Number(Difference_In_Time / 60000);



                        var estimatedTime = Math.round(Number(estimatedDeliveryTime) - Number(differenceTimeMinutes))

                        if (estimatedTime <= 0) {
                            estimatedTime = 0;
                        }
                        console.log('estimatedDeliveryTime', estimatedDeliveryTime);
                        console.log('Difference_In_Time', Difference_In_Time);
                        console.log('estimatedTime', estimatedTime);
                    } else {
                        var estimatedTime = order.estimatedDeliveryTime;
                    }



                    var orderResp = {};

                    orderResp.orderNo = order.orderNo;
                    orderResp.orderTime = order.orderTime;
                    orderResp.finalPrice = order.finalPrice;
                    orderResp.price = order.price;
                    orderResp.discount = order.discount;
                    orderResp.estimatedDeliveryTime = estimatedTime.toString();
                    orderResp.orderStatus = order.orderStatus;
                    orderResp.specialInstruction = order.specialInstruction;
                    orderResp.appliedPromocode = order.promocodeId;
                    orderResp.paymentMode = order.paymentType;
                    orderResp.vendorId = order.vendorId;

                    //Payment
                    var paymentDetails = await paymentSchema.findOne({ orderId: orderId });

                    if (paymentDetails != null) {
                        orderResp.paymentDetails = await getPaymentDetails(paymentDetails, order.paymentType);
                    } else {
                        orderResp.paymentDetails = '';
                    }

                    //Order Review
                    var OrderReviewCheck = await OrderReviewSchema.findOne({ customerId: order.customerId, orderId: order._id });
                    if (OrderReviewCheck == null) {
                        orderResp.userReviewStatus = 'NO'
                    } else {
                        orderResp.userReviewStatus = 'YES'
                    }

                    //Options & Extra


                    var orderDetails = order.orderDetails;
                    var orderExtraArr = [];
                    if (orderDetails.length > 0) {
                        for (let details of orderDetails) {
                            var orderExtraObj = {
                                orderId: details.orderId,
                                offerId: details.offerId,
                                _id: details._id,
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

                            orderExtraArr.push(orderExtraObj);
                        }
                    }
                    orderResp.orderDetails = orderExtraArr;

                    //Vendor Info
                    var vendorInfo = await vendorSchema.findOne({ _id: order.vendorId });
                    orderResp.restaurantName = vendorInfo.restaurantName;
                    orderResp.address = vendorInfo.address;
                    orderResp.restaurantImage = `${config.serverhost}:${config.port}/img/vendor/${vendorInfo.banner}`;
                    orderResp.logo = `${config.serverhost}:${config.port}/img/vendor/${vendorInfo.logo}`;



                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Order Details.',
                        response_data: orderResp
                    })
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
    },
    //Customer Order Cancel API
    orderCancel: (data, callBack) => {
        if (data) {
            var orderId = data.body.orderId;
            var responseOrder = {};

            orderSchema
                .findOne({ _id: orderId })
                .then(async function (order) {


                    var refundPaymentRes = await refundPayment(order);

                    if (refundPaymentRes == 'success') {
                        updateStatus({ orderStatus: 'CANCELLED', orderStatusChangeTime: new Date(), orderCancelReason: 'Customer cancelled' }, { _id: orderId });

                        //NOTIFICATION SETTINGS CHECK
                        var checkNotSettings = await checkNotificationSettings(order.vendorId, 'OrderCancellation');


                        //SEND PUSH MESSAGE

                        //Fetch Current Count
                        var vendorOwnerData = await vendorOwnerSchema.findOne({ vendorId: order.vendorId });
                        var currentCount = vendorOwnerData.badgeCount;
                        var newCount = Number(Number(currentCount) + 1);

                        //AUTO NOTIFICATION
                        var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Cancel order', userType: 'VENDOR' });
                        if (autoNotificationFetch != null) {
                            var pushMessage = autoNotificationFetch.content;
                        } else {
                            var pushMessage = 'Order has been cancelled'
                        }

                        var receiverId = order.vendorId;
                        var pushDataset = {
                            orderNo: order.orderNo,
                            title: 'Cancel order',
                            type: 'CANCEL',
                            orderId: orderId,
                            badgeCount: newCount,
                            messageType: 'order'
                        }

                        if (checkNotSettings == true) {
                            sendPush(receiverId, pushMessage, pushDataset);
                        }
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

                        if (order.userType == 'CUSTOMER') {
                            //SAVE LOG
                            var logObj = {
                                customerId: order.customerId,
                                type: 'Customer Order Cancel',
                                log: 'Customer cancelled an order',
                                addedTime: new Date()
                            }
                            saveCustomerLog(logObj);

                        }

                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'Order Status changed successfully.',
                            response_data: {}
                        });
                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Something went wrong.',
                            response_data: {}
                        });
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
    },
    //Customer Order Submit Review
    orderSubmitReview: (data, callBack) => {
        if (data) {
            var orderId = data.orderId;

            var customerId = data.customerId;

            orderSchema
                .findOne({ _id: orderId })
                .then((order) => {
                    if (order != null) {

                        OrderReviewSchema
                            .findOne({ orderId: orderId, customerId: customerId })
                            .then(async (orderRev) => {

                                if (orderRev == null) {

                                    var customerComment = {
                                        customer: data.customerComment
                                    }

                                    var insertReview = {
                                        orderId: orderId,
                                        vendorId: order.vendorId,
                                        customerId: data.customerId,
                                        customerName: data.customerName,
                                        comment: customerComment,
                                        customerRating: data.customerRating
                                    }



                                    new OrderReviewSchema(insertReview).save(async function (err, result) {
                                        if (err) {
                                            console.log(err);
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });
                                        } else {

                                            if (order.userType == 'CUSTOMER') {
                                                //SAVE LOG
                                                var logObj = {
                                                    customerId: order.customerId,
                                                    type: 'Customer Review Submit',
                                                    log: 'Customer submit a review',
                                                    addedTime: new Date()
                                                }
                                                saveCustomerLog(logObj);

                                            }

                                            updateAvrgReview(order.vendorId);
                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'Review added successfully.',
                                                response_data: {}
                                            });
                                        }
                                    })

                                } else {

                                    var customerComment = {
                                        customer: data.customerComment
                                    }

                                    var insertReview = {
                                        orderId: orderId,
                                        vendorId: order.vendorId,
                                        customerId: data.customerId,
                                        customerName: data.customerName,
                                        comment: customerComment,
                                        customerRating: data.customerRating
                                    }

                                    OrderReviewSchema.update({ _id: orderRev._id }, {
                                        $set: insertReview
                                    }, function (err, res) {
                                        if (err) {
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });
                                        } else {
                                            if (res.nModified == 1) {
                                                if (order.userType == 'CUSTOMER') {
                                                    //SAVE LOG
                                                    var logObj = {
                                                        customerId: order.customerId,
                                                        type: 'Customer Review Submit',
                                                        log: 'Customer submit a review',
                                                        addedTime: new Date()
                                                    }
                                                    saveCustomerLog(logObj);

                                                }
                                                updateAvrgReview(order.vendorId);
                                                callBack({
                                                    success: true,
                                                    STATUSCODE: 200,
                                                    message: 'Review updated successfully.',
                                                    response_data: {}
                                                });
                                            } else {
                                                callBack({
                                                    success: false,
                                                    STATUSCODE: 500,
                                                    message: 'Internal DB error',
                                                    response_data: {}
                                                });
                                            }

                                        }
                                    });
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
    getReviews: (data, callBack) => {
        if (data) {
            var reqBody = data.body;


            /** Check for vendor existence */
            OrderReviewSchema.find({ vendorId: reqBody.vendorId })
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

    //Customer Order Cancel API
    reOrder: (data, callBack) => {
        if (data) {
            var orderId = data.body.orderId;
            var responseOrder = {};

            orderSchema
                .findOne({ _id: orderId })
                .populate('orderDetails')
                .then(async function (order) {

                    // console.log(order);
                    // return;
                    var orderDetails = order.orderDetails;
                    if (orderDetails.length > 0) {
                        for (orderDetail of orderDetails) {

                            var itemCheck = await itemSchema.findOne({ $or: [{ _id: orderDetail.itemId }, { itemName: orderDetail.item }] });

                            console.log('itemCheck', itemCheck);

                        }
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
    },
    //Customer Offer List API
    promoCodeList: (data, callBack) => {
        if (data) {
            // var promoData = {
            //     fromDate: new Date(),
            //     toDate: new Date(),
            //     promoType: 'PERCENTAGE',
            //     promoPrice: 40,
            //     promoConditions: 'Get 40 % off above Rs 499 for all dishes',
            //     promoCode: 'FMAPP 40'
            // }
            // new promoCodeSchema(promoData).save(async function (err, result) {
            //     console.log(err);
            // });

            if (data.body.userType == 'GUEST') {
                callBack({
                    success: true,
                    STATUSCODE: 200,
                    message: 'All Promo Code',
                    response_data: { code: [] }
                });


            } else {

                var vendorId = data.body.vendorId;
                var restaurantArr = [];
                restaurantArr.push(vendorId);

                promoCodeSchema.find({ $and: [{ fromDate: { $lte: new Date() } }, { toDate: { $gte: new Date() } }, { $or: [{ vendorId: { $in: restaurantArr } }, { vendorType: 'ALL' }] }, { isDeleted: { $ne: true } }, { isActive: { $ne: false } }] })
                    .sort({ sortOrder: 1, createdAt: -1 })
                    .then((allcodes) => {
                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'All Promo Code',
                            response_data: { code: allcodes }
                        });
                    })
                    .catch((error) => {
                        console.log(error);
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    });

            }
        }
    },
    //Customer apply promo code
    applyPromoCode: (data, callBack) => {
        if (data) {


            var customerId = data.body.customerId;
            var userType = data.body.userType;
            var promoCode = data.body.promoCode;
            // var amount = data.body.amount;

            // console.log(data.body);

            var subTotal = data.body.subTotal;
            var deliveryCharge = data.body.deliveryCharge;
            var allTotal = data.body.allTotal;
            var disTyp = 0;

            var vendorId = data.body.vendorId;
            var restaurantArr = [];
            restaurantArr.push(vendorId);

            promoCodeSchema.findOne(
                { $and: [{ fromDate: { $lte: new Date() } }, { toDate: { $gte: new Date() } }, { promoCode: promoCode }, { $or: [{ vendorId: { $in: restaurantArr } }, { vendorType: 'ALL' },] }, { isDeleted: { $ne: true } }, { isActive: { $ne: false } }] }
            )
                .then(async (promo) => {
                    if (promo != null) {
                        var continueSign = 0;

                        if (promo.usageType != 'MULTIPLE') {

                            if (userType == 'CUSTOMER') {
                                var orderPromoCheck = await orderSchema.findOne({ promocodeId: promoCode, customerId: customerId });

                                if (orderPromoCheck != null) {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: `Sorry !! You have already applied this promo code.`,
                                        response_data: {}
                                    });
                                } else {
                                    continueSign++;
                                }
                            } else {
                                continueSign++;
                            }
                        } else {
                            continueSign++;
                        }

                        if (continueSign > 0) {

                            //  console.log(promo.promoCategory);
                            if (promo.promoCategory == 'SUB_TOTAL') {
                                var amount = data.body.subTotal;
                                disTyp = 1;
                            } else if (promo.promoCategory == 'DELIVERY_CHARGE') {
                                var amount = data.body.deliveryCharge;
                                disTyp = 2;
                            } else {
                                var amount = data.body.allTotal;
                                disTyp = 3;
                            }



                            //MIN CAP LOGIC
                            if (Number(amount) < Number(promo.promoCodeAmountMinCap)) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 422,
                                    message: `Promo is not applicable for this Order, please refer to Promo T&Cs.`,
                                    response_data: {}
                                });
                            } else {
                                var applyPromoId = (promo._id).toString();


                                var discountAmount = amount;
                                var promoPrice = promo.discountAmount;
                                if (promo.discountType == 'PERCENTAGE') {

                                    //MAX CAP LOGIC
                                    if (Number(amount) >= Number(promo.promoCodeAmountMaxCap)) {
                                        var amountCartDis = promo.promoCodeAmountMaxCap;
                                    } else {
                                        var amountCartDis = amount;
                                    }

                                    var totalDiscount = (Number(amountCartDis) * Number(promoPrice) / 100);


                                    discountAmount = (Number(amount) - totalDiscount); //2700


                                } else if (promo.discountType == 'FLAT') {

                                    //MAX CAP LOGIC
                                    if (Number(amount) >= Number(promo.promoCodeAmountMaxCap)) {
                                        var amountCartDis = promo.promoCodeAmountMaxCap;
                                    } else {
                                        var amountCartDis = amount;
                                    }

                                    var totalDiscount = Number(promoPrice);


                                    discountAmount = (Number(amount) - Number(totalDiscount));
                                }



                                // if ((Number(totalDiscount) >= Number(promo.promoCodeAmountMinCap)) && (Number(totalDiscount) <= Number(promo.promoCodeAmountMaxCap))) {

                                // }
                                //  else {
                                //     callBack({
                                //         success: false,
                                //         STATUSCODE: 422,
                                //         message: `Promo code valid for amount NGN ${promo.promoCodeAmountMinCap} to NGN ${promo.promoCodeAmountMaxCap}`,
                                //         response_data: {}
                                //     });
                                // }
                                if (disTyp == 1) {
                                    var subTotalFinal = discountAmount
                                    var deliveryChargeFinal = deliveryCharge
                                    var allTotalFinal = (Number(discountAmount) + Number(deliveryCharge))
                                } else if (disTyp == 2) {
                                    var subTotalFinal = subTotal
                                    var deliveryChargeFinal = discountAmount
                                    var allTotalFinal = (Number(subTotal) + Number(discountAmount))
                                } else if (disTyp == 3) {
                                    var subTotalFinal = subTotal
                                    var deliveryChargeFinal = deliveryCharge
                                    var allTotalFinal = discountAmount
                                }

                                console.log('allTotalFinal', allTotalFinal);
                                console.log('allTotal', allTotal);
                                console.log('totalDiscount', totalDiscount);



                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: `Discounted amount`,
                                    response_data: { applyPromoId: applyPromoId, subTotal: parseFloat(subTotal), deliveryCharge: parseFloat(deliveryCharge), allTotal: parseFloat(allTotal), subTotalFinal: parseFloat(subTotalFinal), deliveryChargeFinal: parseFloat(deliveryChargeFinal), allTotalFinal: parseFloat(allTotalFinal), totalDiscount: totalDiscount }
                                });

                            }





                        } else {
                            callBack({
                                success: false,
                                STATUSCODE: 422,
                                message: `Sorry !! You have already applied this promo code.`,
                                response_data: {}
                            });
                        }




                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: `Sorry!! This Promo code is not valid`,
                            response_data: {}
                        });
                    }
                })
                .catch((error) => {
                    console.log(error);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                });
        }
    },
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

                var scrtKey = `Bearer ${config.payment.secret_key}`

                const urlPath = `/transaction/verify/${reference}`
                const https = require('https');

                const options = {
                    hostname: 'api.paystack.co',
                    port: 443,
                    path: urlPath,
                    method: 'GET',
                    headers: {
                        Authorization: scrtKey
                    }
                }
                const req = https.request(options, resp => {
                    let data = ''
                    resp.on('data', (chunk) => {
                        data += chunk
                    });
                    resp.on('end', async () => {
                        console.log(JSON.parse(data));

                        var paymentResp = JSON.parse(data);

                        if (paymentResp.status == true) {

                            if (paymentResp.data.status == 'success') {

                                if (paymentMode == 'CARD') {

                                    var resSend = {
                                        last4: paymentResp.data.authorization.last4,
                                        exp_month: paymentResp.data.authorization.exp_month,
                                        exp_year: paymentResp.data.authorization.exp_year,
                                        card_type: paymentResp.data.authorization.card_type,
                                        bank: paymentResp.data.authorization.bank
                                    }

                                    await paymentSchema.updateOne({ _id: payment._id }, {
                                        $set: { customerPaymentDetails: resSend }
                                    });

                                    var resp = `XXXX XXXX XXXX ${paymentResp.data.authorization.last4}`;

                                    return resolve(resp);
                                } else if (paymentMode == 'USSD') {

                                    var resSend = {
                                        exp_month: paymentResp.data.authorization.exp_month,
                                        exp_year: paymentResp.data.authorization.exp_year,
                                        card_type: paymentResp.data.authorization.card_type,
                                        bank: paymentResp.data.authorization.bank
                                    }

                                    await paymentSchema.updateOne({ _id: payment._id }, {
                                        $set: { customerPaymentDetails: resSend }
                                    });

                                    var resp = `${paymentResp.data.authorization.bank}`;

                                    return resolve(resp);

                                } else if (paymentMode == 'BANK_TRANSFER') {

                                    var resSend = {
                                        exp_month: paymentResp.data.authorization.exp_month,
                                        exp_year: paymentResp.data.authorization.exp_year,
                                        card_type: paymentResp.data.authorization.card_type,
                                        bank: paymentResp.data.authorization.bank
                                    }

                                    await paymentSchema.updateOne({ _id: payment._id }, {
                                        $set: { customerPaymentDetails: resSend }
                                    });

                                    var resp = `${paymentResp.data.authorization.bank}`;

                                    return resolve(resp);

                                } else {
                                    return resolve('');
                                }
                            } else {

                                return resolve('');
                            }
                        } else {

                            return resolve('');

                        }
                    })
                }).on('error', error => {
                    console.error(error);
                    return resolve('');
                })
                // req.write()
                req.end()

            }
        }




    });
}

function updateStatus(update, cond) {
    return new Promise(function (resolve, reject) {
        orderSchema.updateOne(cond, {
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
                                var scrtKey = `Bearer ${config.payment.secret_key}`;

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

                                        }
                                    })
                                }).on('error', error => {
                                    console.error(error);
                                    return resolve('error');
                                })
                                req.write(params)
                                req.end()

                            } else {
                                return resolve('success');
                            }
                        })
                        .catch((err) => {
                            console.log('err', err);
                            return resolve('error');
                        })
                }

            })
            .catch((err) => {
                console.log('err', err);
                return resolve('error');
            })

    });
}

function updateAvrgReview(vendorId) {
    return new Promise(async function (resolve, reject) {

        var vendorReview = await OrderReviewSchema.find({ vendorId: vendorId });
        var revCount = vendorReview.length;
        var totalCustomerRating = 0;
        if (vendorReview.length > 0) {
            for (let vendorRev of vendorReview) {
                totalCustomerRating += Number(vendorRev.customerRating);
            }
        }

        var avrgRvw = (Number(totalCustomerRating) / Number(revCount));

        await vendorSchema.update({ _id: vendorId }, {
            $set: { rating: avrgRvw }
        });

        return resolve();

    });
}

function sendPush(receiverId, pushMessage, orderObj) {
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

function checkNotificationSettings(userId, notType) {
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