
var orderSchema = require('../../schema/Order');
var orderDetailsSchema = require('../../schema/OrderDetail');
var orderCreateSchema = require('../../schema/OrderCreate');
var vendorSchema = require('../../schema/Vendor');
var customerSchema = require('../../schema/Customer');
var userDeviceLoginSchemaSchema = require('../../schema/UserDeviceLogin');

var paymentSchema = require('../../schema/Payment');
var vendorAccountSchema = require('../../schema/VendorAccount');
var vendorPaymentSettingSchema = require('../../schema/VendorPaymentSetting');
var UserNotificationSchema = require('../../schema/UserNotification');
var userNotificationSettingSchema = require('../../schema/UserNotificationSetting');
var autoNotificationSchema = require('../../schema/AutoNotification');
var PushLib = require('../../libraries/pushlib/send-push');
var config = require('../../config');

exports.autoDelayOrder = function () {
  var CronJob = require('cron').CronJob; // innitialize cron job 
  new CronJob('* * * * *', function () { //CRON WILL HIT EVERY MINUTE

    orderSchema
      .find({ orderStatus: { $in: ['ACCEPTED', 'DELAYED'] } })
      .then(async (orders) => {

        if (orders.length > 0) {
          for (let order of orders) {

            //   console.log('order',order);

            if (order.orderStatus == 'ACCEPTED') {
              var delTime = 0;
              var currentDelayedTime = Number(order.foodReadyTime);

              var date1 = order.orderAcceptedTime;
            } else {
              var delTime = Number(order.delayedTime);
              var currentDelayedTime = Number(order.delayedTime);


              var date1 = order.orderStatusChangeTime;
            }

            var date2 = new Date();

            // To calculate the time difference of two dates 
            var Difference_In_Time = Number(date2.getTime()) - Number(date1.getTime());

            var differenceTimeMinutes = Number(Difference_In_Time / 60000);

            //    console.log('differenceTimeMinutes',differenceTimeMinutes);
            //  console.log('currentDelayedTime',currentDelayedTime);

            if (differenceTimeMinutes >= currentDelayedTime) {
              var delayedTime = Number(Number(delTime) + 30);
              var vendorId = order.vendorId;

              //SEND PUSH MESSAGE
              if (order.userType == 'CUSTOMER') {
                //AUTO NOTIFICATION
                var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Delay order' });
                if (autoNotificationFetch != null) {

                  var restaurantDt = await vendorSchema.findOne({ _id: order.vendorId });
                  var restaurantName = `with ${restaurantDt.restaurantName}`;
                  var autoContent = autoNotificationFetch.content;
                  autoContent = autoContent.replace("[WRN]", restaurantName);

                  var pushMessage = `${autoContent} ${delayedTime} mins`
                } else {
                  var pushMessage = `Your order has been delayed by ${delayedTime} mins`
                }

                // console.log('pushMessage', pushMessage);
                // return;

                var pushMsg = pushMessage
                var title = 'Delay order'
                //NOTIFICATION SETTINGS CHECK
                var checkNotSettings = await checkNotificationSettings(order.customerId, 'RestaurantOrderDelayed');


                sendOrderPush(order, pushMsg, title, checkNotSettings)

              }


              updateStatus({ orderStatus: 'DELAYED', delayedTime: delayedTime, orderStatusChangeTime: new Date() }, { _id: order._id });
              // console.log('Updated');
            }




          }
        }



      });
  }, null, true, 'UTC');
},
  exports.paymentTransfer = function () {
    var CronJob = require('cron').CronJob; // innitialize cron job 
    new CronJob('0 */1 * * *', function () { //CRON WILL HIT EVERY HOUR

      orderSchema
        .find({ paymentStatus: 'CUSTOMER_PAID', orderStatus: 'COMPLETED' })
        .then(async (orders) => {
          if (orders.length > 0) {

            for (let order of orders) {

              //  console.log('----1',order._id);

              //ORDER DATE TIME
              var orderDate = order.orderTime;

              var dayOrder = orderDate.getDate();
              var monthOrder = orderDate.getMonth();
              var yearOrder = orderDate.getFullYear();
              var hourOrder = orderDate.getHours();
              var minuteOrder = orderDate.getMinutes();

              var orderDateTime = new Date(`${monthOrder}-${dayOrder}-${yearOrder} ${hourOrder}:${minuteOrder}`);

              //CURRENT DATE TIME
              var currentDate = new Date();

              var daycurrentDate = currentDate.getDate();
              var monthcurrentDate = currentDate.getMonth();
              var yearcurrentDate = currentDate.getFullYear();
              var hourcurrentDate = currentDate.getHours();
              var minutecurrentDate = currentDate.getMinutes();

              var currentDateTime = new Date(`${monthcurrentDate}-${daycurrentDate}-${yearcurrentDate} ${hourcurrentDate}:${minutecurrentDate}`);

              var checkCtoEx = orderDateTime;
              checkCtoEx.setHours(checkCtoEx.getHours() + 48);



              if (currentDateTime >= checkCtoEx) { //Current Date time is greater than Order date time + 48 hours
                //  console.log('----2',order._id);
                paymentSchema
                  .findOne({ orderId: order._id, vendorPaymentStatus: 'INITIATE' })  //ADMIN MANUALLY NOT PAID
                  .then(async (vendorPayment) => {

                    if (vendorPayment != null) {

                      // console.log('----3', vendorPayment);

                      var paymentId = vendorPayment._id;

                      vendorAccountSchema
                        .findOne({ vendorId: order.vendorId, isActive: true })  //FETCH VENDOR ACCOUNT
                        .then(async (vendorAccount) => {

                          if (vendorAccount != null) {

                            const https = require('https');

                            var scrtKey = `Bearer ${config.payment.secret_key}`;
                            const params = JSON.stringify({
                              "type": "nuban",
                              "name": vendorAccount.accountName,
                              "account_number": vendorAccount.accountNo,
                              "bank_code": vendorAccount.bankCode,
                              "currency": "NGN"
                            })
                            const options = {
                              hostname: 'api.paystack.co',
                              port: 443,
                              path: '/transferrecipient',
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
                                var transferReceipt = JSON.parse(data);

                                // console.log('transferReceipt',transferReceipt);
                                // return;

                                // console.log('vendorPayment.amount', vendorPayment.totalAmount);

                                if (transferReceipt.status == true) {
                                  var transferReceiptCode = transferReceipt.data.recipient_code;
                                  var transferAmount = Number(Number(vendorPayment.totalAmount) * 100);
                                  var transferReason = `Transfer for order no ${order.orderNo}`;

                                  // console.log('transferAmount', transferAmount);


                                  const transparams = JSON.stringify({
                                    "source": "balance",
                                    "amount": transferAmount,
                                    "recipient": transferReceiptCode,
                                    "reason": transferReason
                                  })
                                  const transoptions = {
                                    hostname: 'api.paystack.co',
                                    port: 443,
                                    path: '/transfer',
                                    method: 'POST',
                                    headers: {
                                      Authorization: scrtKey,
                                      'Content-Type': 'application/json'
                                    }
                                  }
                                  const transreq = https.request(transoptions, transresp => {
                                    let transdata = ''
                                    transresp.on('data', (transchunk) => {
                                      transdata += transchunk
                                    });
                                    transresp.on('end', () => {
                                      // console.log(JSON.parse(transdata));
                                      var transferComplete = JSON.parse(transdata);

                                      // console.log('transferComplete', transferComplete);


                                      if (transferComplete.status == true) {
                                        var updatePayment = {
                                          vendorPaymentReference: transferComplete.data.reference,
                                          vendorPaymentTransferCode: transferComplete.data.transfer_code,
                                          vendorPaymentStatus: 'PENDING'
                                        }

                                        paymentSchema.updateOne({ _id: paymentId }, {
                                          $set: updatePayment
                                        }, function (err, paymentres) {
                                          if (err) {
                                            // console.log(err);
                                          } else {
                                            if (paymentres.nModified == 1) {
                                              // console.log('Transfer success');
                                            }
                                          }
                                        });
                                      }


                                    })
                                  }).on('error', error => {
                                    console.error(error)
                                  })
                                  transreq.write(transparams)
                                  transreq.end()
                                }
                              })
                            }).on('error', error => {
                              console.error(error)
                            })
                            req.write(params)
                            req.end()

                          }

                        }).catch((err) => {
                          console.log(err);

                        })



                    }
                  }).catch((err) => {
                    console.log(err);

                  })
              }
            }
          }
        }).catch((err) => {
          console.log(err);
        })
    }, null, true, 'UTC');


  },
  exports.createOrder = function () {
    var CronJob = require('cron').CronJob; // innitialize cron job 
    new CronJob('* * * * *', function () { //CRON WILL HIT EVERY MINUTE

      orderSchema
        .find({ orderStatus: 'ACCEPTED', deliveryPreference: 'DELIVERY' })
        .populate('orderDetails')
        .then(async (orders) => {


          var remainingMintute = 15;

          if (orders.length > 0) {
            for (let order of orders) {
              var orderId = order._id;

              var orderCreateData = await orderCreateSchema.findOne({ orderId: orderId, orderCreateStatus: 'YES' });
              if (orderCreateData == null) {

                var foodReadyTime = Number(order.foodReadyTime);


                var orderStatusChangeDate = order.orderStatusChangeTime;
                var currentDate = new Date();

                // To calculate the time difference of two dates 
                var Difference_In_Time = Number(currentDate.getTime()) - Number(orderStatusChangeDate.getTime());

                var differenceTimeMinutes = Number(Difference_In_Time / 60000);

                // console.log('foodReadyTime', foodReadyTime);
                // console.log('differenceTimeMinutes', differenceTimeMinutes);
                // console.log('remainingMintute', remainingMintute);

                if ((foodReadyTime - differenceTimeMinutes) <= remainingMintute) {

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
                                // console.log('itemOption', itemOption);
                                if (itemOption.arrOptions.length > 0) {
                                  for (arrOption of itemOption.arrOptions) {
                                    // console.log('arrOption', arrOption);
                                    itemDescription += `,${arrOption.name}`

                                  }
                                }
                              }
                            }

                            if (itemExtras.length > 0) {
                              for (let itemExtra of itemExtras) {
                                // console.log('itemExtra', itemExtra);
                                itemDescription += `,${itemExtra.itemName}(${itemExtra.quantity})`
                              }
                            }

                            // console.log('itemOptions', itemOptions);
                            // console.log('itemExtras', itemExtras);

                          }
                        }

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

                        request.post({
                          headers: { 'content-type': 'application/json' },
                          url: `${config.delivery.deliveryUrl}order_create`,
                          body: reqBody,
                        }, function (error, response, body) {
                          // console.log('error:', error);
                          // console.log('Status:', response.statusCode);
                          // console.log('Headers:', JSON.stringify(response.headers));
                          // console.log('Response:', body);

                          var body = JSON.parse(body);

                          if (error) {
                            connsole.log('error', error);

                          } else {
                            if (response.statusCode == 200) {
                              var orderCreateObj = {
                                orderId: orderId,
                                orderTrackingId: body.order_id,
                                orderFare: body.fare,
                                orderDistance: body.distance,
                                orderTime: body.time,
                                orderCreateStatus: 'YES'
                              }

                              new orderCreateSchema(orderCreateObj).save(async function (err, ocreateResult) {
                                if (err) {
                                  console.log('err', err);

                                } else {
                                  // console.log('ocreateResult', ocreateResult);
                                }
                              });
                            }
                          }
                        });
                      }
                    })
                    .catch((err) => {
                      console.log('err', err);

                    })


                }

              }


            }
          }



        });
    }, null, true, 'UTC');

  },

  exports.completedOrder = function () {
    var CronJob = require('cron').CronJob; // innitialize cron job 
    new CronJob('* * * * *', function () { //CRON WILL HIT EVERY MINUTE

      orderSchema
        .find({ orderStatus: { $in: ['ACCEPTED', 'DELAYED', 'COLLECTED', 'MODIFIED', 'READY'] } })
        .then(async (orders) => {

          if (orders.length > 0) {
            for (let order of orders) {

              var orderId = order._id;


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
                }, async function (error, response, body) {
                  console.log('error:', error);
                  console.log('Status:', response.statusCode);
                  console.log('Headers:', JSON.stringify(response.headers));
                  console.log('Response:', body);

                  var body = JSON.parse(body);

                  if (error) {
                    connsole.log('error', error);
                  } else {
                    if (response.statusCode == 200) {

                      if (body.status == 'completed') { //GOKADA COMPLETED

                        updateStatus({ orderStatus: 'COMPLETED', orderStatusChangeTime: new Date() }, { _id: orderId });

                        //SEND PUSH MESSAGE
                        if (order.userType == 'CUSTOMER') {
                          //AUTO NOTIFICATION
                          var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Completed order' });
                          if (autoNotificationFetch != null) {

                            var restaurantDt = await vendorSchema.findOne({ _id: order.vendorId });
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
                          var checkNotSettings = await checkNotificationSettings(order.customerId, 'RestaurantOrderConfirmation');


                          sendOrderPush(order, pushMsg, title, checkNotSettings)

                        }

                      } else if (body.status == 'cancelled') { //GOKADA CANCELLED


                        updateStatus({ orderStatus: 'CANCELLED', orderStatusChangeTime: new Date(), orderCancelReason: 'Delivery boy cancelled' }, { _id: orderId });

                        //SEND PUSH MESSAGE
                        if (order.userType == 'CUSTOMER') {
                          //AUTO NOTIFICATION
                          var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Cancel order', userType: 'CUSTOMER' });
                          if (autoNotificationFetch != null) {

                            var restaurantDt = await vendorSchema.findOne({ _id: order.vendorId });
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
                          var checkNotSettings = await checkNotificationSettings(order.customerId, 'OrderStatusNotification');


                          sendOrderPush(order, pushMsg, title, checkNotSettings)

                        }

                      } else if ((body.status == 'driver-started') || (body.status == 'in-progress')) { //GOKADA COLLECTED


                        updateStatus({ orderStatus: 'COLLECTED', orderStatusChangeTime: new Date() }, { _id: orderId });

                        //SEND PUSH MESSAGE
                        if (order.userType == 'CUSTOMER') {
                          //AUTO NOTIFICATION
                          var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'Collected order' });
                          if (autoNotificationFetch != null) {

                            var restaurantDt = await vendorSchema.findOne({ _id: order.vendorId });
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
                          var checkNotSettings = await checkNotificationSettings(order.customerId, 'OrderStatusNotification');


                          sendOrderPush(order, pushMsg, title, checkNotSettings)

                        }

                      }
                    }
                  }
                });
              }
            }
          }
        });
    }, null, true, 'UTC');
  },

  exports.oldNotificationDelete = function () {
    var CronJob = require('cron').CronJob; // innitialize cron job 

    //0 0 * * *
    new CronJob('0 0 * * *', function () { //CRON WILL HIT EVEY DAY 12 AM


      UserNotificationSchema
        .find({ automatic: 'NO' })
        .then(async (notifications) => {
          if (notifications.length > 0) {

            for (let notification of notifications) {

              //  console.log('----1',order._id);

              //ORDER DATE TIME
              var notificationDate = notification.createdAt;

              var dayOrder = notificationDate.getDate();
              var monthOrder = notificationDate.getMonth();
              var yearOrder = notificationDate.getFullYear();
              var hourOrder = notificationDate.getHours();
              var minuteOrder = notificationDate.getMinutes();

              var notificationDateTime = new Date(`${monthOrder}-${dayOrder}-${yearOrder} ${hourOrder}:${minuteOrder}`);

              //CURRENT DATE TIME
              var currentDate = new Date();

              var daycurrentDate = currentDate.getDate();
              var monthcurrentDate = currentDate.getMonth();
              var yearcurrentDate = currentDate.getFullYear();
              var hourcurrentDate = currentDate.getHours();
              var minutecurrentDate = currentDate.getMinutes();

              var currentDateTime = new Date(`${monthcurrentDate}-${daycurrentDate}-${yearcurrentDate} ${hourcurrentDate}:${minutecurrentDate}`);

              var checkCtoEx = notificationDateTime;
              checkCtoEx.setHours(checkCtoEx.getHours() + 360); //15 Days

              if (currentDateTime >= checkCtoEx) { //Current Date time is greater than Order date time + 48 hours
                // console.log(notification.createdAt);

                UserNotificationSchema.deleteOne({ _id: notification._id }, async function (err) {
                  if (err) {
                    console.log(err);
                  } else {
                    // console.log('done');
                  }

                });
              } else {
                // console.log('No');
              }

            }

          }

        });



    }, null, true, 'UTC');

  },
  exports.inactiveVendor = function () {
    var CronJob = require('cron').CronJob; // innitialize cron job 

    //0 */1 * * *
    ///* * * * *
    new CronJob('0 */1 * * *', function () { //CRON WILL HIT HOUR

      vendorSchema
        .find({ $and: [{ activationToDate: { $lte: new Date() } }, { isActive: true }] })
        .then(async (vendorRes) => {

          console.log('vendorRes', vendorRes);

          if (vendorRes.length > 0) {
            for (let vendorRs of vendorRes) {

              vendorSchema.updateOne({ _id: vendorRs._id }, {
                $set: { isActive: false }
              }, function (err, vendorRes) {
                if (err) {
                  console.log('err', err);
                } else {
                  if (vendorRes.nModified == 1) {
                    console.log('inactiveVendor success');
                  }
                }
              });

              console.log(vendorRs.restaurantName);
            }
          }

        })
        .catch((err) => {
          console.log('err', err);
        })
    }, null, true, 'UTC');

  },

  function updateStatus(update, cond) {
    return new Promise(function (resolve, reject) {
      orderSchema.updateOne(cond, {
        $set: update
      }, function (err, res) {
        if (err) {
          return resolve(err);
        } else {
          return resolve(res);
        }
      });
    });
  }


function sendPush(receiverId, pushMessage, orderObj) {
  // console.log('----PUSH START-----')
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
              'badge': badgeCount,
              'alert': pushMessage,
              'deviceToken': deviceToken,
              'pushMode': customer.pushMode,
              'dataset': orderObj
            }

            PushLib.sendPushAndroid(andPushData)
              .then(async function (success) { //PUSH SUCCESS

                // console.log('push_success', success);
              }).catch(async function (err) { //PUSH FAILED

                // console.log('push_err', err);
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
                // console.log('push_success', success);

              }).catch(async function (err) { //PUSH FAILED
                // console.log('push_err', err);
              });
            //IOS PUSH END
          }
        }
      }
    })
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
      restaurantName: vendorName,
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
      // console.log('err', err);
      // console.log('result', resultNt);
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
