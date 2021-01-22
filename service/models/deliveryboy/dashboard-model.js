

var deliveryBoySchema = require('../../schema/DeliveryBoy');
var deliveryBoyOrderSchema = require('../../schema/DeliveryBoyOrder');
var vendorSchema = require('../../schema/Vendor');
var orderSchema = require('../../schema/Order');
const config = require('../../config');

module.exports = {

    dashboard: (req, callBack) => {
        if (req) {
            var data = req.body;

            console.log('data', data);

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

                        var responseObj = {
                            profileImage: `${config.serverhost}:${config.port}/img/profile-pic/` + customer.profileImage,
                            availability: customer.availability
                        }

                        deliveryBoyOrderSchema.find({ deliveryBoyId: data.customerId, deliveryStatus: 'NEW' })
                            .then(async (dbOrders) => {
                                var newOrderArr = [];

                                if (dbOrders.length > 0) {
                                    for (let dbOrder of dbOrders) {
                                        var newOrderObj = {}
                                        newOrderObj.restaurant = await vendorSchema.findOne({ _id: dbOrder.vendorId });

                                        newOrderArr.push(newOrderObj);
                                    }
                                }

                                responseObj.nwOrder = newOrderArr;

                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'Home page details',
                                    response_data: responseObj
                                });

                            })
                            .catch((err) => {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong',
                                    response_data: {}
                                });
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
    availabilityChange: (req, callBack) => {
        if (req) {
            var data = req.body;
            var availability = data.availability;


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

                        deliveryBoySchema.updateOne({ _id: data.customerId }
                            , { $set: { availability: availability } })
                            .then((updateRes) => {

                                if (updateRes.nModified == 1) {
                                    callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: 'Availability status changed successfully.',
                                        response_data: {}
                                    });
                                } else {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'Something went wrong',
                                        response_data: {}
                                    });
                                }
                            })
                            .catch((err) => {
                                console.log('err', err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong',
                                    response_data: {}
                                });
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
    acceptRejectChange: (req, callBack) => {
        if (req) {
            var data = req.body;
            var acceptRejectChange = data.acceptReject;
            var deliveryOrderId = data.deliveryOrderId;


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

                        deliveryBoyOrderSchema.findOne({ _id: deliveryOrderId, deliveryStatus: 'NEW' })
                            .then(async (dbOrder) => {

                                if (dbOrder != null) {
                                    deliveryBoyOrderSchema.updateOne({ _id: deliveryOrderId }
                                        , { $set: { deliveryStatus: acceptRejectChange } })
                                        .then((updateRes) => {

                                            if (updateRes.nModified == 1) {

                                                if (acceptRejectChange == 'ACCEPTED') {
                                                    var msg = 'Order Accepted successfully.'
                                                } else {
                                                    var msg = 'Order Rejected successfully.'
                                                }
                                                callBack({
                                                    success: true,
                                                    STATUSCODE: 200,
                                                    message: msg,
                                                    response_data: {}
                                                });
                                            } else {
                                                callBack({
                                                    success: false,
                                                    STATUSCODE: 422,
                                                    message: 'Something went wrong',
                                                    response_data: {}
                                                });
                                            }
                                        })
                                        .catch((err) => {
                                            console.log('err', err);
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Something went wrong',
                                                response_data: {}
                                            });
                                        })
                                } else {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'New order not found',
                                        response_data: {}
                                    });
                                }
                            })
                            .catch((err) => {
                                console.log('err', err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong',
                                    response_data: {}
                                });
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
    orderDetails: (req, callBack) => {
        if (req) {
            var data = req.body;
            var deliveryOrderId = data.deliveryOrderId;


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

                        deliveryBoyOrderSchema.findOne({ _id: deliveryOrderId })
                            .then(async (dbOrder) => {

                                if (dbOrder != null) {

                                    //orderSchema Info
                                    var order = await orderSchema.findOne({ _id: dbOrder.orderId }).populate('orderDetails');

                                    var orderResp = {};

                                    orderResp.orderNo = order.orderNo;
                                    orderResp.orderTime = order.orderTime;
                                    orderResp.finalPrice = order.finalPrice;
                                    orderResp.estimatedDeliveryTime = order.estimatedDeliveryTime;
                                    orderResp.orderStatus = order.orderStatus;
                                    orderResp.specialInstruction = order.specialInstruction;
                                    orderResp.appliedPromocode = order.promocodeId;
                                    orderResp.paymentMode = order.paymentType;
                                    orderResp.vendorId = order.vendorId;

                                    //Delivery
                                    orderResp.deliveryHouseNo = order.deliveryHouseNo;
                                    orderResp.deliveryCountryCode = order.deliveryCountryCode;
                                    orderResp.deliveryPhone = order.deliveryPhone;
                                    orderResp.deliveryLandmark = order.deliveryLandmark;
                                    orderResp.deliveryFullAddress = order.deliveryFullAddress;
                                    orderResp.deliveryAddressType = order.deliveryAddressType;
                                    orderResp.deliveryLat = order.deliveryLat;
                                    orderResp.deliveryLong = order.deliveryLong;


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
                                    orderResp.restaurantImage = `${config.serverhost}:${config.port}/img/vendor/${vendorInfo.banner}`;
                                    orderResp.logo = `${config.serverhost}:${config.port}/img/vendor/${vendorInfo.logo}`;
                                    orderResp.address = vendorInfo.address;
                                    orderResp.countryCode = vendorInfo.countryCode;
                                    orderResp.contactPhone = vendorInfo.contactPhone;

                                    //Customer


                                    callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: 'Order details',
                                        response_data: orderResp
                                    });


                                } else {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'New order not found',
                                        response_data: {}
                                    });
                                }
                            })
                            .catch((err) => {
                                console.log('err', err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong',
                                    response_data: {}
                                });
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
    trackOrder: (req, callBack) => {
        if (req) {
            var data = req.body;
            var deliveryOrderId = data.deliveryOrderId;


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

                        deliveryBoyOrderSchema.findOne({ _id: deliveryOrderId })
                            .then(async (dbOrder) => {

                                if (dbOrder != null) {

                                    //orderSchema Info
                                    var order = await orderSchema.findOne({ _id: dbOrder.orderId });

                                     //Vendor Info
                                     var restaurantInfo = await vendorSchema.findOne({ _id: order.vendorId });

                                    var orderTrackObj = {
                                        customerLat: order.deliveryLat,
                                        customerLong: order.deliveryLong,
                                        vendorLat: (restaurantInfo.location.coordinates[1]).toString(),
                                        vendorLong: (restaurantInfo.location.coordinates[0]).toString(),
                          
                                      }

                                   



                                      callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: 'Order track',
                                        response_data: orderTrackObj
                                    });


                                } else {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'New order not found',
                                        response_data: {}
                                    });
                                }
                            })
                            .catch((err) => {
                                console.log('err', err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong',
                                    response_data: {}
                                });
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
    postLatLong: (req, callBack) => {
        if (req) {
            var data = req.body;
            var lat = data.lat;
            var long = data.long;
            var deliveryOrderId = data.deliveryOrderId;


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

                        deliveryBoyOrderSchema.findOne({ _id: deliveryOrderId})
                            .then(async (dbOrder) => {

                                if (dbOrder != null) {
                                    deliveryBoyOrderSchema.updateOne({ _id: deliveryOrderId }
                                        , { $set: { lattitude: lat, longitude: long} })
                                        .then((updateRes) => {

                                            if (updateRes.nModified == 1) {

                                                callBack({
                                                    success: true,
                                                    STATUSCODE: 200,
                                                    message: '',
                                                    response_data: {}
                                                });
                                            } else {
                                                callBack({
                                                    success: false,
                                                    STATUSCODE: 422,
                                                    message: 'Something went wrong',
                                                    response_data: {}
                                                });
                                            }
                                        })
                                        .catch((err) => {
                                            console.log('err', err);
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Something went wrong',
                                                response_data: {}
                                            });
                                        })
                                } else {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'New order not found',
                                        response_data: {}
                                    });
                                }
                            })
                            .catch((err) => {
                                console.log('err', err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong',
                                    response_data: {}
                                });
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
    orderStatus: (req, callBack) => {
        if (req) {
            var data = req.body;
            var orderStatus = data.orderStatus;
           
            var deliveryOrderId = data.deliveryOrderId;


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

                        deliveryBoyOrderSchema.findOne({ _id: deliveryOrderId})
                            .then(async (dbOrder) => {

                                if (dbOrder != null) {

                                     //orderSchema Info
                                     var order = await orderSchema.findOne({ _id: dbOrder.orderId });

                                     orderSchema.updateOne({_id: order.orderId}, {
                                        $set: {orderStatus: orderStatus, orderStatusChangeTime: new Date()}
                                    }, async function (err, res) {
                                        if (err) {
                                            callBack({
                                                success: false,
                                                STATUSCODE: 422,
                                                message: 'Something went wrong',
                                                response_data: {}
                                            });
                                        } else {
                                            
                                            await deliveryBoyOrderSchema.updateOne({_id: deliveryOrderId}, {
                                                $set: {deliveryStatus: 'COLLECTED'}
                                            })

                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'Status changed successfully',
                                                response_data: {}
                                            });

                                        }
                                    });
                                    
                                } else {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'New order not found',
                                        response_data: {}
                                    });
                                }
                            })
                            .catch((err) => {
                                console.log('err', err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong',
                                    response_data: {}
                                });
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
}