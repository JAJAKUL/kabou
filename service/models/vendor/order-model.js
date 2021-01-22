
var config = require('../../config');
var orderSchema = require('../../schema/Order');
var OrderDetailSchema = require('../../schema/OrderDetail');
var paymentSchema = require('../../schema/Payment');
var orderRefundSchema = require('../../schema/OrderRefund');
var userDeviceLoginSchemaSchema = require('../../schema/UserDeviceLogin');
var customerSchema = require('../../schema/Customer');
var vendorSchema = require('../../schema/Vendor');
var PushLib = require('../../libraries/pushlib/send-push');
var UserNotificationSchema = require('../../schema/UserNotification');
var vendorOwnerSchema = require('../../schema/VendorOwner');
var userNotificationSettingSchema = require('../../schema/UserNotificationSetting');
var autoNotificationSchema = require('../../schema/AutoNotification');

module.exports = {
    //Order Status
    orderStatus: (data, callBack) => {
        if (data) {
            var respData = {};
            respData.orderStatus = ['NEW', 'ACCEPTED', 'READY', 'DELAYED', 'COLLECTED', 'COMPLETED'];

            callBack({
                success: true,
                STATUSCODE: 200,
                message: 'All order Status.',
                response_data: respData
            });
        }
    },
    //Order List
    orderList: (data, callBack) => {
        if (data) {
            var respData = {};

            var vendorId = data.vendorId;

            var findCond = { vendorId: vendorId };
            if ((data.orderStatus != '') && (data.orderStatus != 'ALL')) {
                findCond.orderStatus = data.orderStatus;
            }

            orderSchema
                .find(findCond)
                .sort({ orderTime: 'desc' })
                .populate('orderDetails')
                .then(async function (res) {

                    if (res.length > 0) {

                        var allOrders = res;
                        var ordersArr = [];
                        for (let order of allOrders) {
                            var orderObj = {};
                            var orderDetailsArr = [];
                            orderObj.orderNo = order.orderNo;
                            orderObj.orderStatus = order.orderStatus;
                            orderObj.orderStatusTime = order.orderStatusChangeTime;
                            orderObj.orderId = order._id;
                            orderObj.preparationTime = order.foodReadyTime;
                            orderObj.delayedTime = order.delayedTime;
                            orderObj.orderCancelReason = order.orderCancelReason;
                            orderObj.orderTime = order.orderTime;
                            orderObj.deliveryPreference = order.deliveryPreference;
                            orderObj.specialInstruction = order.specialInstruction;

                            if (order.userType == 'CUSTOMER') {
                                //Get Customer Info
                                var customerInfo = await customerSchema.findOne({ _id: order.customerId });
                                orderObj.countryCode = (customerInfo.countryCode).toString();
                                orderObj.customerPhone = (customerInfo.phone).toString();
                            } else {
                                orderObj.countryCode = (order.guestCountryCode).toString();
                                orderObj.customerPhone = (order.guestPhone).toString();
                            }


                            if (order.orderDetails.length > 0) {
                                for (let orderDetails of order.orderDetails) {
                                    var orderDetailsObj = {};

                                    var orderDetailsObj = {
                                        orderId: orderDetails.orderId,
                                        offerId: orderDetails.offerId,
                                        _id: orderDetails._id,
                                        item: orderDetails.item,
                                        quantity: orderDetails.quantity,
                                        itemPrice: orderDetails.itemPrice,
                                        totalPrice: orderDetails.totalPrice,
                                        createdAt: orderDetails.createdAt,
                                        updatedAt: orderDetails.updatedAt,
                                        __v: orderDetails.__v,
                                        itemOptions: orderDetails.itemOptions,
                                        orderExtras: orderDetails.itemExtras
                                    };


                                    orderDetailsArr.push(orderDetailsObj);
                                }
                            }
                            orderObj.orderDetails = orderDetailsArr;

                            ordersArr.push(orderObj);
                        }

                        // console.log(ordersArr);
                        // respData['ordersArr'] = ordersArr;
                        // respData.push({'ordersArr':ordersArr});
                        respData.ordersArr = ordersArr;

                        // console.log(respData);
                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'All orders.',
                            response_data: respData
                        });

                    } else {
                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'No order found.',
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
                    });

                });

        }
    },
    //Order Confirm
    orderConfirm: (data, callBack) => {
        if (data) {
            var respData = {};
            var newOrderResult = ['ACCEPTED', 'MODIFIED', 'CANCELLED'];
            var acceptedOrderResult = ['DELAYED', 'READY', 'COLLECTED', 'COMPLETED'];
            var delayedOrderResult = ['READY', 'DELAYED', 'COLLECTED', 'COMPLETED'];
            var readyOrderResult = ['COLLECTED', 'COMPLETED'];
            var deliveredOrderResult = ['COMPLETED'];

            var vendorId = data.vendorId;
            var orderId = data.orderId;
            var orderChangeRes = data.orderResult;






            orderSchema
                .findOne({ vendorId: vendorId, _id: orderId })
                .then(async function (res) {
                    // console.log('res',res);
                    if (res != null) {

                        // var customerData = await customerSchema.findOne({ _id: res.customerId });
                        // var currentCount = customerData.badgeCount;
                        // var newCount = Number(Number(currentCount) + 1);

                        if (res.orderStatus == 'NEW') {
                            if (newOrderResult.includes(orderChangeRes)) {
                                if (orderChangeRes == 'CANCELLED') {
                                    var cancellationReason = data.orderCancelReason;

                                    if ((cancellationReason == '') || (cancellationReason == undefined)) {
                                        callBack({
                                            success: false,
                                            STATUSCODE: 422,
                                            message: 'Order Cancellation reason is required.',
                                            response_data: {}
                                        });
                                    } else {
                                        var refundPaymentRes = await refundPayment(res);

                                        if (refundPaymentRes == 'success') {
                                            updateStatus({ orderStatus: orderChangeRes, orderStatusChangeTime: new Date(), orderCancelReason: cancellationReason }, { _id: orderId });




                                            //SEND PUSH MESSAGE
                                            if (res.userType == 'CUSTOMER') {
                                                //AUTO NOTIFICATION
                                                var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Cancel order', userType: 'CUSTOMER' });
                                                if (autoNotificationFetch != null) {

                                                    var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                                    var restaurantName = `with ${restaurantDt.restaurantName}`;
                                                    var autoContent = autoNotificationFetch.content;
                                                    autoContent = autoContent.replace("[WRN]", restaurantName);

                                                    var pushMessage = autoContent;
                                                } else {
                                                    var pushMessage = 'You order has been cancelled'
                                                }
                                                var pushMsg = pushMessage
                                                var title = 'Cancel order'
                                                //NOTIFICATION SETTINGS CHECK
                                                var checkNotSettings = await checkNotificationSettings(res.customerId, 'OrderStatusNotification');


                                                sendOrderPush(res, pushMsg, title, checkNotSettings)

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

                                    }
                                } else {
                                    updateStatus({ orderStatus: orderChangeRes, orderStatusChangeTime: new Date() }, { _id: orderId });
                                    if (orderChangeRes == 'ACCEPTED') {
                                        updateStatus({ orderAcceptedTime: new Date() }, { _id: orderId });

                                        //SEND PUSH MESSAGE
                                        if (res.userType == 'CUSTOMER') {

                                            //AUTO NOTIFICATION
                                            var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Accept order' });
                                            if (autoNotificationFetch != null) {

                                                var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                                var restaurantName = `with ${restaurantDt.restaurantName}`;
                                                var autoContent = autoNotificationFetch.content;
                                                autoContent = autoContent.replace("[WRN]", restaurantName);

                                                var pushMessage = autoContent;
                                            } else {
                                                var pushMessage = 'Your order has been accepted'
                                            }


                                            var pushMsg = pushMessage
                                            var title = 'Accept order'



                                            //NOTIFICATION SETTINGS CHECK
                                            var checkNotSettings = await checkNotificationSettings(res.customerId, 'RestaurantOrderConfirmation');


                                            sendOrderPush(res, pushMsg, title, checkNotSettings)

                                        }


                                    } else if (orderChangeRes == 'MODIFIED') {
                                        //SEND PUSH MESSAGE
                                        if (res.userType == 'CUSTOMER') {

                                            //AUTO NOTIFICATION
                                            var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Modified order' });
                                            if (autoNotificationFetch != null) {

                                                var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                                var restaurantName = `with ${restaurantDt.restaurantName}`;
                                                var autoContent = autoNotificationFetch.content;
                                                autoContent = autoContent.replace("[WRN]", restaurantName);

                                                var pushMessage = autoContent;
                                            } else {
                                                var pushMessage = 'Your order has been modified'
                                            }

                                            var pushMsg = pushMessage
                                            var title = 'Modified order'
                                            //NOTIFICATION SETTINGS CHECK
                                            var checkNotSettings = await checkNotificationSettings(res.customerId, 'OrderStatusNotification');


                                            sendOrderPush(res, pushMsg, title, checkNotSettings)

                                        }
                                    }
                                    callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: 'Order Status changes successfully.',
                                        response_data: {}
                                    });
                                }


                            } else {
                                callBack({
                                    success: false,
                                    STATUSCODE: 422,
                                    message: 'Order result is either ACCEPTED OR MODIFIED OR CANCELLED.',
                                    response_data: {}
                                });
                            }
                        } else if (res.orderStatus == 'ACCEPTED') {
                            if (acceptedOrderResult.includes(orderChangeRes)) {

                                if (orderChangeRes == 'DELAYED') {
                                    var delayedTime = data.delayedTimeMin;
                                    updateStatus({ orderStatus: orderChangeRes, delayedTime: delayedTime, orderStatusChangeTime: new Date() }, { _id: orderId });

                                    //SEND PUSH MESSAGE
                                    if (res.userType == 'CUSTOMER') {
                                        //AUTO NOTIFICATION
                                        var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Delay order' });
                                        if (autoNotificationFetch != null) {

                                            var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                            var restaurantName = `with ${restaurantDt.restaurantName}`;
                                            var autoContent = autoNotificationFetch.content;
                                            autoContent = autoContent.replace("[WRN]", restaurantName);

                                            var pushMessage = `${autoContent} ${delayedTime} mins`
                                        } else {
                                            var pushMessage = `Your order has been delayed by ${delayedTime} mins`
                                        }

                                        var pushMsg = pushMessage
                                        var title = 'Delay order'
                                        //NOTIFICATION SETTINGS CHECK
                                        var checkNotSettings = await checkNotificationSettings(res.customerId, 'RestaurantOrderDelayed');


                                        sendOrderPush(res, pushMsg, title, checkNotSettings)

                                    }

                                } else {
                                    if (orderChangeRes == 'READY') {
                                        //SEND PUSH MESSAGE
                                        if (res.userType == 'CUSTOMER') {

                                            //AUTO NOTIFICATION
                                            var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Ready order' });
                                            if (autoNotificationFetch != null) {

                                                var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                                var restaurantName = `with ${restaurantDt.restaurantName}`;
                                                var autoContent = autoNotificationFetch.content;
                                                autoContent = autoContent.replace("[WRN]", restaurantName);

                                                var pushMessage = autoContent
                                            } else {
                                                var pushMessage = `Your order has been ready to deliver`
                                            }

                                            var pushMsg = pushMessage
                                            var title = 'Ready order'
                                            //NOTIFICATION SETTINGS CHECK
                                            var checkNotSettings = await checkNotificationSettings(res.customerId, 'RestaurantOrderReady');


                                            sendOrderPush(res, pushMsg, title, checkNotSettings)

                                        }
                                    } else if (orderChangeRes == 'COLLECTED') {
                                        //SEND PUSH MESSAGE
                                        if (res.userType == 'CUSTOMER') {

                                            //AUTO NOTIFICATION
                                            var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Collected order' });
                                            if (autoNotificationFetch != null) {

                                                var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                                var restaurantName = `with ${restaurantDt.restaurantName}`;
                                                var autoContent = autoNotificationFetch.content;
                                                autoContent = autoContent.replace("[WRN]", restaurantName);

                                                var pushMessage = autoContent
                                            } else {
                                                var pushMessage = `Your order has been collected`
                                            }

                                            var pushMsg = pushMessage
                                            var title = 'Collected order'
                                            //NOTIFICATION SETTINGS CHECK
                                            var checkNotSettings = await checkNotificationSettings(res.customerId, 'OrderStatusNotification');


                                            sendOrderPush(res, pushMsg, title, checkNotSettings)

                                        }
                                    } else if (orderChangeRes == 'COMPLETED') {
                                        //SEND PUSH MESSAGE
                                        if (res.userType == 'CUSTOMER') {
                                            //AUTO NOTIFICATION
                                            var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Completed order' });
                                            if (autoNotificationFetch != null) {

                                                var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                                var restaurantName = `with ${restaurantDt.restaurantName}`;
                                                var autoContent = autoNotificationFetch.content;
                                                autoContent = autoContent.replace("[WRN]", restaurantName);

                                                var pushMessage = autoContent
                                            } else {
                                                var pushMessage = `Your order has delivered`
                                            }

                                            var pushMsg = pushMessage
                                            var title = 'Completed order'
                                            //NOTIFICATION SETTINGS CHECK
                                            var checkNotSettings = await checkNotificationSettings(res.customerId, 'RestaurantOrderDelivered');


                                            sendOrderPush(res, pushMsg, title, checkNotSettings)

                                        }
                                    }
                                    updateStatus({ orderStatus: orderChangeRes, orderStatusChangeTime: new Date() }, { _id: orderId });
                                }


                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Order Status changes successfully.',
                                    response_data: {}
                                });

                            } else {
                                callBack({
                                    success: false,
                                    STATUSCODE: 422,
                                    message: 'Order result is either DELAYED OR COLLECTED OR COMPLETED.',
                                    response_data: {}
                                });
                            }
                        } else if (res.orderStatus == 'DELAYED') {
                            if (delayedOrderResult.includes(orderChangeRes)) {
                                if (orderChangeRes == 'DELAYED') {
                                    var delayedTime = data.delayedTimeMin;

                                    updateStatus({ orderStatus: orderChangeRes, delayedTime: delayedTime, orderStatusChangeTime: new Date() }, { _id: orderId });

                                    //SEND PUSH MESSAGE
                                    if (res.userType == 'CUSTOMER') {
                                        //AUTO NOTIFICATION
                                        var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Delay order' });
                                        if (autoNotificationFetch != null) {

                                            var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                            var restaurantName = `with ${restaurantDt.restaurantName}`;
                                            var autoContent = autoNotificationFetch.content;
                                            autoContent = autoContent.replace("[WRN]", restaurantName);

                                            var pushMessage = `${autoContent} ${delayedTime} mins`
                                        } else {
                                            var pushMessage = `Your order has been delayed by ${delayedTime} mins`
                                        }

                                        var pushMsg = pushMessage
                                        var title = 'Delay order'
                                        //NOTIFICATION SETTINGS CHECK
                                        var checkNotSettings = await checkNotificationSettings(res.customerId, 'RestaurantOrderDelayed');


                                        sendOrderPush(res, pushMsg, title, checkNotSettings)

                                    }

                                } else if (orderChangeRes == 'READY') {

                                    //SEND PUSH MESSAGE
                                    if (res.userType == 'CUSTOMER') {
                                        //AUTO NOTIFICATION
                                        var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Ready order' });
                                        if (autoNotificationFetch != null) {

                                            var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                            var restaurantName = `with ${restaurantDt.restaurantName}`;
                                            var autoContent = autoNotificationFetch.content;
                                            autoContent = autoContent.replace("[WRN]", restaurantName);

                                            var pushMessage = autoContent
                                        } else {
                                            var pushMessage = `Your order has been ready to deliver`
                                        }

                                        var pushMsg = pushMessage
                                        var title = 'Ready order'
                                        //NOTIFICATION SETTINGS CHECK
                                        var checkNotSettings = await checkNotificationSettings(res.customerId, 'RestaurantOrderReady');


                                        sendOrderPush(res, pushMsg, title, checkNotSettings)

                                    }

                                    updateStatus({ orderStatus: orderChangeRes, orderStatusChangeTime: new Date() }, { _id: orderId });

                                } else if (orderChangeRes == 'COLLECTED') {
                                    //SEND PUSH MESSAGE
                                    if (res.userType == 'CUSTOMER') {
                                        //AUTO NOTIFICATION
                                        var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Collected order' });
                                        if (autoNotificationFetch != null) {

                                            var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                            var restaurantName = `with ${restaurantDt.restaurantName}`;
                                            var autoContent = autoNotificationFetch.content;
                                            autoContent = autoContent.replace("[WRN]", restaurantName);

                                            var pushMessage = autoContent
                                        } else {
                                            var pushMessage = `Your order has been collected`
                                        }

                                        var pushMsg = pushMessage
                                        var title = 'Collected order'
                                        //NOTIFICATION SETTINGS CHECK
                                        var checkNotSettings = await checkNotificationSettings(res.customerId, 'OrderStatusNotification');


                                        sendOrderPush(res, pushMsg, title, checkNotSettings)

                                    }

                                    updateStatus({ orderStatus: orderChangeRes, orderStatusChangeTime: new Date() }, { _id: orderId });

                                } else if (orderChangeRes == 'COMPLETED') {
                                    //SEND PUSH MESSAGE
                                    if (res.userType == 'CUSTOMER') {
                                        //AUTO NOTIFICATION
                                        var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Completed order' });
                                        if (autoNotificationFetch != null) {

                                            var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                            var restaurantName = `with ${restaurantDt.restaurantName}`;
                                            var autoContent = autoNotificationFetch.content;
                                            autoContent = autoContent.replace("[WRN]", restaurantName);

                                            var pushMessage = autoContent
                                        } else {
                                            var pushMessage = `Your order has delivered`
                                        }

                                        var pushMsg = pushMessage
                                        var title = 'Completed order'
                                        //NOTIFICATION SETTINGS CHECK
                                        var checkNotSettings = await checkNotificationSettings(res.customerId, 'RestaurantOrderDelivered');


                                        sendOrderPush(res, pushMsg, title, checkNotSettings)

                                    }

                                    updateStatus({ orderStatus: orderChangeRes, orderStatusChangeTime: new Date() }, { _id: orderId });
                                } else {
                                    updateStatus({ orderStatus: orderChangeRes, orderStatusChangeTime: new Date() }, { _id: orderId });
                                }


                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Order Status changes successfully.',
                                    response_data: {}
                                });

                            } else {
                                callBack({
                                    success: false,
                                    STATUSCODE: 422,
                                    message: 'Order result is either COLLECTED OR COMPLETED.',
                                    response_data: {}
                                });
                            }
                        } else if (res.orderStatus == 'READY') {
                            if (readyOrderResult.includes(orderChangeRes)) {

                                if (orderChangeRes == 'COLLECTED') {
                                    //SEND PUSH MESSAGE
                                    if (res.userType == 'CUSTOMER') {
                                        //AUTO NOTIFICATION
                                        var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Collected order' });
                                        if (autoNotificationFetch != null) {

                                            var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                            var restaurantName = `with ${restaurantDt.restaurantName}`;
                                            var autoContent = autoNotificationFetch.content;
                                            autoContent = autoContent.replace("[WRN]", restaurantName);

                                            var pushMessage = autoContent
                                        } else {
                                            var pushMessage = `Your order has been collected`
                                        }

                                        var pushMsg = pushMessage
                                        var title = 'Collected order'
                                        //NOTIFICATION SETTINGS CHECK
                                        var checkNotSettings = await checkNotificationSettings(res.customerId, 'OrderStatusNotification');


                                        sendOrderPush(res, pushMsg, title, checkNotSettings)

                                    }

                                    updateStatus({ orderStatus: orderChangeRes, orderStatusChangeTime: new Date() }, { _id: orderId });

                                } else if (orderChangeRes == 'COMPLETED') {
                                    //SEND PUSH MESSAGE
                                    if (res.userType == 'CUSTOMER') {
                                        //AUTO NOTIFICATION
                                        var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Completed order' });
                                        if (autoNotificationFetch != null) {

                                            var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                            var restaurantName = `with ${restaurantDt.restaurantName}`;
                                            var autoContent = autoNotificationFetch.content;
                                            autoContent = autoContent.replace("[WRN]", restaurantName);

                                            var pushMessage = autoContent
                                        } else {
                                            var pushMessage = `Your order has delivered`
                                        }

                                        var pushMsg = pushMessage
                                        var title = 'Completed order'
                                        //NOTIFICATION SETTINGS CHECK
                                        var checkNotSettings = await checkNotificationSettings(res.customerId, 'RestaurantOrderDelivered');


                                        sendOrderPush(res, pushMsg, title, checkNotSettings)

                                    }

                                    updateStatus({ orderStatus: orderChangeRes, orderStatusChangeTime: new Date() }, { _id: orderId });
                                }

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Order Status changes successfully.',
                                    response_data: {}
                                });

                            } else {
                                callBack({
                                    success: false,
                                    STATUSCODE: 422,
                                    message: 'Order result must be COLLECTED or COMPLETED.',
                                    response_data: {}
                                });
                            }
                        } else if (res.orderStatus == 'COLLECTED') {
                            if (deliveredOrderResult.includes(orderChangeRes)) {

                                if (orderChangeRes == 'COMPLETED') {
                                    //SEND PUSH MESSAGE
                                    if (res.userType == 'CUSTOMER') {
                                        //AUTO NOTIFICATION
                                        var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Completed order' });
                                        if (autoNotificationFetch != null) {

                                            var restaurantDt = await vendorSchema.findOne({ _id: res.vendorId });
                                            var restaurantName = `with ${restaurantDt.restaurantName}`;
                                            var autoContent = autoNotificationFetch.content;
                                            autoContent = autoContent.replace("[WRN]", restaurantName);

                                            var pushMessage = autoContent
                                        } else {
                                            var pushMessage = `Your order has delivered`
                                        }

                                        var pushMsg = pushMessage
                                        var title = 'Completed order'
                                        //NOTIFICATION SETTINGS CHECK
                                        var checkNotSettings = await checkNotificationSettings(res.customerId, 'RestaurantOrderDelivered');


                                        sendOrderPush(res, pushMsg, title, checkNotSettings)

                                    }
                                }
                                updateStatus({ orderStatus: orderChangeRes, orderStatusChangeTime: new Date() }, { _id: orderId });

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Order Status changes successfully.',
                                    response_data: {}
                                });

                            } else {
                                callBack({
                                    success: false,
                                    STATUSCODE: 422,
                                    message: 'Order result must be COMPLETED.',
                                    response_data: {}
                                });
                            }
                        }



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
                    });

                });

        }
    },
    dashboard: async (data, callBack) => {
        if (data) {
            var respData = {};

            var vendorId = data.body.vendorId;

            var vendorData = await vendorOwnerSchema.findOne({ vendorId: vendorId });


            var badgeCount = Number(vendorData.badgeCount);

            orderSchema
                .find({ vendorId: vendorId })
                .sort({ orderTime: 'desc' })
                .then(async function (orders) {
                    var preparedOrder = [];
                    var preparedOrderCnt = 0;
                    var deliveredOrder = [];
                    var deliveredOrderCnt = 0;
                    var delayedOrder = [];
                    var delayedOrderCnt = 0;
                    var newOrder = [];
                    var newOrderCnt = 0;
                    var preOrder = [];
                    var preOrderCnt = 0;
                    var readyOrder = [];
                    var readyOrderCnt = 0;

                    console.log(orders);
                    if (orders.length > 0) {

                        for (let order of orders) {
                            if ((order.orderStatus == 'COLLECTED') || (order.orderStatus == 'COMPLETED')) {
                                deliveredOrder.push(order);
                                deliveredOrderCnt = deliveredOrder.length;
                            } else if (order.orderStatus == 'NEW') {
                                newOrder.push(order);
                                newOrderCnt = newOrder.length;
                            } else if (order.orderStatus == 'DELAYED') {
                                delayedOrder.push(order);
                                delayedOrderCnt = delayedOrder.length;
                            } else if (order.orderStatus == 'READY') {
                                readyOrder.push(order);
                                readyOrderCnt = readyOrder.length;
                            } else if (order.orderStatus == 'ACCEPTED') {
                                preparedOrder.push(order);
                                preparedOrderCnt = preparedOrder.length;
                            } else if (order.orderStatus == 'PRE') {
                                preOrder.push(order);
                                preOrderCnt = preOrder.length;
                            }
                        }

                    }
                    // console.log(respData);

                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Dashboard data.',
                        response_data: {
                            'prepared': preparedOrderCnt,
                            'delivered': deliveredOrderCnt,
                            'delay': delayedOrderCnt,
                            'new': newOrderCnt,
                            'pre': preOrderCnt,
                            'ready': readyOrderCnt,
                            'badgeCount': badgeCount
                        }
                    });
                })
                .catch(function (err) {
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
}

function updateStatus(update, cond) {
    return new Promise(function (resolve, reject) {
        orderSchema.update(cond, {
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

function listDateTimeFormat(date) {
    var dateFormatCheck = date;

    var day = dateFormatCheck.getDate();

    var month = (Number(dateFormatCheck.getMonth()) + 1);

    if (Number(month) < 10) {
        month = `0${month}`
    }

    var year = dateFormatCheck.getFullYear();

    var hours = dateFormatCheck.getHours(); // => 9
    if (hours < 10) {
        hours = `0${hours}`
    }
    var minutes = dateFormatCheck.getMinutes(); // =>  30
    if (minutes < 10) {
        minutes = `0${minutes}`
    }
    var seconds = dateFormatCheck.getSeconds(); // => 51
    if (seconds < 10) {
        seconds = `0${seconds}`
    }

    var dateformat = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    return dateformat;
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
                    } else if (notType == 'RestaurantOrderDelayed') {
                        if ((notSetting.notificationData.RestaurantOrderDelayed == true) || (notSetting.notificationData.RestaurantOrderDelayed == undefined)) {
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

