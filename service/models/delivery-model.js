
var config = require('../config');
var vendorSchema = require('../schema/Vendor');
var orderCreateSchema = require('../schema/OrderCreate');
var orderSchema = require('../schema/Order');


module.exports = {
  //Check fare
  checkFare: (data, callBack) => {
    if (data) {
      var vendorId = data.body.vendorId;

      vendorSchema.findOne({
        _id: vendorId,
        isActive: true
      })
        .then((vendor) => {
          if (vendor != null) {
            var pickupLat = vendor.location.coordinates[1];
            var pickupLong = vendor.location.coordinates[0];

            var destinationLat = data.body.deliveryLat;
            var destinationLong = data.body.deliveryLong;

            var request = require('request');

            var bodyReq = {
              api_key: `${config.delivery.api_key}`,
              pickup_latitude: pickupLat,
              pickup_longitude: pickupLong,
              delivery_latitude: destinationLat,
              delivery_longitude: destinationLong
            }

            var reqBody = JSON.stringify(bodyReq);

            console.log('Request', bodyReq);

            if (config.delivery.testMode == 'NO') {

              request.post({
                headers: { 'content-type': 'application/json' },
                url: `${config.delivery.deliveryUrl}order_estimate`,
                body: reqBody,
              }, function (error, response, body) {
                console.log('error:', error);
                console.log('Status:', response.statusCode);
                console.log('Headers:', JSON.stringify(response.headers));
                console.log('Response:', body);

                var body = JSON.parse(body);

                if (error) {
                  connsole.log('error', error);
                  callBack({
                    success: false,
                    STATUSCODE: 500,
                    message: 'Something went wrong',
                    response_data: {}
                  });
                } else {
                  if (response.statusCode == 200) {
                    callBack({
                      success: true,
                      STATUSCODE: 200,
                      message: 'Delivery fare',
                      response_data: body
                    });

                  } else {
                    callBack({
                      success: false,
                      STATUSCODE: 422,
                      message: body.message,
                      response_data: {}
                    });
                  }
                }




              });

            } else {
              callBack({
                success: true,
                STATUSCODE: 200,
                message: 'Delivery fare',
                response_data: {
                  "distance": 5,
                  "time": 12,
                  "fare": 500
                }
              });
            }
          } else {
            callBack({
              success: false,
              STATUSCODE: 422,
              message: 'Restaurant not found',
              response_data: {}
            });
          }

        })
        .catch((err) => {
          console.log('err', err);
          callBack({
            success: false,
            STATUSCODE: 500,
            message: 'Internal DB error',
            response_data: {}
          });
        })

    }
  },
  //Order track
  orderTrack: (data, callBack) => {
    if (data) {
      var orderId = data.body.orderId;

      orderSchema.findOne({ _id: orderId })
        .then(async (order) => {

          if (order != null) {

            var restaurantInfo = await vendorSchema.findOne({ _id: order.vendorId });

            var orderTrackObj = {
              customerLat: order.deliveryLat,
              customerLong: order.deliveryLong,
              customerAddress: order.deliveryFullAddress,
              vendorLat: (restaurantInfo.location.coordinates[1]).toString(),
              vendorLong: (restaurantInfo.location.coordinates[0]).toString(),
              customerCarePhone: '',
              estimatedDeliveryTime: order.estimatedDeliveryTime,
              orderNo: order.orderNo,
              address: restaurantInfo.address

            }

            if (order.orderStatus == 'NEW') {
              orderTrackObj.status = 1
            } else if (order.orderStatus == 'CANCELLED') {
              orderTrackObj.status = -2
            } else if (order.orderStatus == 'READY') {
              orderTrackObj.status = 3
            } else if (order.orderStatus == 'COLLECTED') {
              orderTrackObj.status = 4
            } else if (['ACCEPTED', 'DELAYED'].includes(order.orderStatus)) {
              orderTrackObj.status = 2
            } else {
              orderTrackObj.status = 3
            }

            var orderTrack = await orderCreateSchema.findOne({
              orderId: orderId
            });

            if (orderTrack != null) {
              var trackOrderId = orderTrack.orderTrackingId;

              var request = require('request');

              var bodyReq = {
                api_key: `${config.delivery.api_key}`,
                order_id: trackOrderId

              }

              var reqBody = JSON.stringify(bodyReq);

              console.log('Request', bodyReq);

              request.post({
                headers: { 'content-type': 'application/json' },
                url: `${config.delivery.deliveryUrl}order_status`,
                body: reqBody,
              }, function (error, response, body) {
                console.log('error:', error);
                console.log('Status:', response.statusCode);
                console.log('Headers:', JSON.stringify(response.headers));
                console.log('Response:', body);

                var body = JSON.parse(body);

                if (error) {
                  connsole.log('error', error);
                  callBack({
                    success: false,
                    STATUSCODE: 500,
                    message: 'Something went wrong',
                    response_data: {}
                  });
                } else {
                  if (response.statusCode == 200) {

                    if (body.status == 'completed') {
                      orderTrackObj.status = 5
                    } else if (body.status == 'cancelled') {
                      orderTrackObj.status = -2
                    }

                    orderTrackObj.deliveryLat = body.driver_latitude
                    orderTrackObj.deliveryLong = body.driver_longitude

                    callBack({
                      success: true,
                      STATUSCODE: 200,
                      message: 'Order status',
                      response_data: orderTrackObj
                    });

                  } else {
                    callBack({
                      success: false,
                      STATUSCODE: 422,
                      message: body.message,
                      response_data: {}
                    });
                  }
                }
              });
            } else {
              orderTrackObj.deliveryLat = ''
              orderTrackObj.deliveryLong = ''

              callBack({
                success: true,
                STATUSCODE: 200,
                message: 'Order status',
                response_data: orderTrackObj
              });
            }





          } else {
            callBack({
              success: false,
              STATUSCODE: 422,
              message: 'Order not found',
              response_data: {}
            });
          }



        })
        .catch((err) => {
          console.log('err', err);
          callBack({
            success: false,
            STATUSCODE: 500,
            message: 'Internal DB error',
            response_data: {}
          });
        })


    }
  },
  //Order track
  orderCreate: (data, callBack) => {
    if (data) {
      var orderId = data.body.orderId;
      var orderSchema = require('../schema/Order');
      var customerSchema = require('../schema/Customer');

      orderSchema
        .findOne({ _id: orderId })
        .populate('orderDetails')
        .then(async (order) => {


          var remainingMintute = 15;

          // console.log('order',order);
          // return;



          // if (orders.length > 0) {
          //   for (let order of orders) {
          var orderId = order._id;

          var orderCreateData = await orderCreateSchema.findOne({ orderId: orderId, orderCreateStatus: 'YES' });
          // if (orderCreateData == null) {

          var foodReadyTime = Number(order.foodReadyTime);


          var orderStatusChangeDate = order.orderStatusChangeTime;
          var currentDate = new Date();

          // To calculate the time difference of two dates 
          var Difference_In_Time = Number(currentDate.getTime()) - Number(orderStatusChangeDate.getTime());

          var differenceTimeMinutes = Number(Difference_In_Time / 60000);

          // console.log('foodReadyTime', foodReadyTime);
          // console.log('differenceTimeMinutes', differenceTimeMinutes);
          // console.log('remainingMintute', remainingMintute);

          // if ((foodReadyTime - differenceTimeMinutes) <= remainingMintute) {

          var vendorId = order.vendorId;

          vendorSchema.findOne({
            _id: vendorId,
            isActive: true
          })
            .then(async (vendor) => {
              if (vendor != null) {

                if (order.userType == 'GUEST') {
                  var customerName = order.guestName;
                } else {
                  var customerData = await customerSchema.findOne({ _id: order.customerId });
                  var customerName = `${customerData.firstName} ${customerData.lastName}`;
                }
                var pickupLat = vendor.location.coordinates[1];
                var pickupLong = vendor.location.coordinates[0];

                var destinationLat = order.deliveryLat;
                var destinationLong = order.deliveryLong;

                var orderDetailsArr = order.orderDetails;

                var itemDescription = '';
                if (orderDetailsArr.length > 0) {
                  for (let orderDetails of orderDetailsArr) {
                    itemDescription += `${orderDetails.item}(${orderDetails.quantity})`
                    var itemOptions = orderDetails.itemOptions;
                    var itemExtras = orderDetails.itemExtras;

                    if (itemOptions.length > 0) {
                      for (let itemOption of itemOptions) {
                        console.log('itemOption', itemOption);
                        if (itemOption.arrOptions.length > 0) {
                          for (arrOption of itemOption.arrOptions) {
                            console.log('arrOption', arrOption);
                            itemDescription += `,${arrOption.name}`

                          }
                        }
                      }
                    }

                    if (itemExtras.length > 0) {
                      for (let itemExtra of itemExtras) {
                        console.log('itemExtra', itemExtra);
                        itemDescription += `,${itemExtra.itemName}(${itemExtra.quantity})`
                      }
                    }

                    console.log('itemOptions', itemOptions);
                    console.log('itemExtras', itemExtras);

                  }
                }


                console.log('itemDescription', itemDescription);


                var request = require('request');

                var bodyReq = {
                  api_key: `${config.delivery.api_key}`,
                  pickup_address: vendor.address,
                  pickup_latitude: pickupLat,
                  pickup_longitude: pickupLong,
                  pickup_name: vendor.restaurantName,
                  pickup_phone: `+234${vendor.contactPhone}`,

                  delivery_address: order.deliveryFullAddress,
                  delivery_latitude: destinationLat,
                  delivery_longitude: destinationLong,
                  delivery_name: customerName,
                  delivery_phone: `+234${order.deliveryPhone}`,
                  Description: itemDescription

                }

                var reqBody = JSON.stringify(bodyReq);

                // console.log('Request', bodyReq);
                // return;

                request.post({
                  headers: { 'content-type': 'application/json' },
                  url: `https://private-anon-076ab7f11f-gokada2.apiary-proxy.com/api/developer/order_create`,
                  body: reqBody,
                }, function (error, response, body) {
                  console.log('error:', error);
                  console.log('Status:', response.statusCode);
                  console.log('Headers:', JSON.stringify(response.headers));
                  console.log('Response:', body);

                  var body = JSON.parse(body);

                  console.log(body);

                });
              }
            })
            .catch((err) => {
              console.log('err', err);

            })


          // }

          // }


          //   }
          // }



        });

    }
  },

}