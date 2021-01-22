
var config = require('../config');
var vendorSchema = require('../schema/Vendor');
var vendorAccountSchema = require('../schema/VendorAccount');
var bankAccountSchema = require('../schema/BankAccount');
var customerCardSchema = require('../schema/CustomerCard');
var paymentReferenceSchema = require('../schema/PaymentReference');
var paymentSchema = require('../schema/Payment');
var orderSchema = require('../schema/Order');
var vendorlogSchema = require('../schema/VendorLog');
const https = require('https');


module.exports = {
  //CUSTOMER
  //Payment initialize
  paymentInitialize: (data, callBack) => {
    if (data) {

      var amount = data.body.amount;
      var email = data.body.email;



      var scrtKey = `Bearer ${config.payment.secret_key}`

      const params = JSON.stringify({
        "email": email,
        "amount": amount
      })
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/initialize',
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
          var paymentResp = JSON.parse(data);

          if (paymentResp.status == true) {

            callBack({
              success: true,
              STATUSCODE: 200,
              message: 'Payment initialize.',
              response_data: paymentResp.data
            });
          } else {
            callBack({
              success: false,
              STATUSCODE: 422,
              message: 'Something went wrong.',
              response_data: {}
            });
          }
        })
      }).on('error', error => {
        console.error(error);
        callBack({
          success: false,
          STATUSCODE: 500,
          message: 'Something went wrong.',
          response_data: {}
        });
      })
      req.write(params)
      req.end()
    }
  },
  //Payment Verify
  paymentVerify: (data, callBack) => {
    if (data) {

      var reference = data.body.reference;
      var amount = data.body.amount;
      var userType = data.body.userType;
      var customerId = data.body.customerId;

      var cusEmail = data.body.email;

      var scrtKey = `Bearer ${config.payment.secret_key}`

      const urlPath = `/transaction/verify/${reference}`

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

              if (paymentResp.data.amount == amount) {

                var paymentRes = {
                  paymentReference: paymentResp.data.reference,
                  paymentAuthorizationCode: paymentResp.data.authorization.authorization_code,
                  paymentSignature: paymentResp.data.authorization.signature,
                  paymentCustomerCode: paymentResp.data.customer.customer_code,
                  status: paymentResp.data.status
                }

                console.log('userType', userType);
                if ((userType == 'CUSTOMER') && (paymentResp.data.channel == 'card')) {

                  var checkCard = await customerCardSchema.findOne({ signature: paymentResp.data.authorization.signature, customerId: customerId })
                  console.log('checkCard', checkCard);
                  if (checkCard == null) {
                    var customerPaymentObj = {
                      customerId: customerId,
                      authorizationCode: paymentResp.data.authorization.authorization_code,
                      signature: paymentResp.data.authorization.signature,
                      authorization: paymentResp.data.authorization,
                      email: cusEmail
                    }

                    new customerCardSchema(customerPaymentObj).save(async function (err, customerPayment) {
                      if (err) {
                        console.log('err', err);

                      } else {
                        console.log('customerPayment', customerPayment);
                      }
                    });
                  }


                }

                var payObj = {
                  paidUserId: customerId,
                  paidBy: 'CUSTOMER',
                  amount: paymentResp.data.amount,
                  reference: paymentResp.data.reference,
                  paymentStatus: 'COMPLETE'
                }
                var paymentRef = await addPaymentRef(payObj);

                if (paymentRef == 'success') {
                  callBack({
                    success: true,
                    STATUSCODE: 200,
                    message: 'Payment successful.',
                    response_data: paymentRes
                  });
                } else {
                  callBack({
                    success: false,
                    STATUSCODE: 500,
                    message: 'Something went wrong.',
                    response_data: {}
                  });
                }


              } else {

                callBack({
                  success: false,
                  STATUSCODE: 422,
                  message: 'Payment failed, please try again.',
                  response_data: {}
                });
              }

            } else {

              var responseClient = {
                reference: paymentResp.data.reference,
                message: paymentResp.data.display_text,
                status: paymentResp.data.status
              }

              var payObj = {
                paidUserId: customerId,
                paidBy: 'CUSTOMER',
                amount: paymentResp.data.amount,
                reference: paymentResp.data.reference,
                paymentStatus: 'PENDING'
              }
              var paymentRef = await addPaymentRef(payObj);

              if (paymentRef == 'success') {

                callBack({
                  success: true,
                  STATUSCODE: 201,
                  message: paymentResp.data.display_text,
                  response_data: responseClient
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

            if (paymentResp.message == 'Denied by fraud system') {
              callBack({
                success: false,
                STATUSCODE: 450,
                message: 'Transaction not Authorised by Bank, please contact your Bank to allow payment.',
                response_data: {}
              });
            } else {
              callBack({
                success: false,
                STATUSCODE: 422,
                message: 'Payment failed, please try again.',
                response_data: {}
              });
            }
          }
        })
      }).on('error', error => {
        console.error(error);
        callBack({
          success: false,
          STATUSCODE: 500,
          message: 'Something went wrong.',
          response_data: {}
        });
      })
      // req.write()
      req.end()
    }
  },
  //Payment cards
  paymentCards: (data, callBack) => {
    if (data) {
      var customerId = data.body.customerId;

      customerCardSchema.find({ customerId: customerId })
        .then((adddetails) => {
          var allCardsArr = [];
          if (adddetails.length > 0) {
            for (adddetail of adddetails) {
              var allCardsObj = {};

              allCardsObj['email'] = adddetail.email;
              allCardsObj['authorization'] = adddetail.authorization;


              allCardsArr.push(allCardsObj);
            }
          }

          callBack({
            success: true,
            STATUSCODE: 200,
            message: 'All saved cards',
            response_data: allCardsArr
          });

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
  //Payment recurring
  paymentRecurring: (data, callBack) => {
    if (data) {
      var customerId = data.body.customerId;
      var authorizationCode = data.body.authorizationCode;
      var email = data.body.email;
      var amount = data.body.amount;

      var scrtKey = `Bearer ${config.payment.secret_key}`

      const params = JSON.stringify({
        "authorization_code": authorizationCode,
        "email": email,
        "amount": amount
      })
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/charge_authorization',
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
        resp.on('end', async () => {
          console.log(JSON.parse(data));
          var requestData = JSON.parse(data);

          if (requestData.status == true) {

            if (requestData.data.status == 'success') {

              var paymentRes = {
                paymentReference: requestData.data.reference,
                paymentAuthorizationCode: requestData.data.authorization.authorization_code,
                paymentSignature: requestData.data.authorization.signature,
                paymentCustomerCode: requestData.data.customer.customer_code,
                status: requestData.data.status
              }

              var payObj = {
                paidUserId: customerId,
                paidBy: 'CUSTOMER',
                amount: requestData.data.amount,
                reference: requestData.data.reference,
                paymentStatus: 'COMPLETE'
              }
              var paymentRef = await addPaymentRef(payObj);

              if (paymentRef == 'success') {

                callBack({
                  success: true,
                  STATUSCODE: 200,
                  message: 'Payment successful.',
                  response_data: paymentRes
                });
              } else {
                callBack({
                  success: false,
                  STATUSCODE: 500,
                  message: 'Something went wrong.',
                  response_data: {}
                });
              }


            } else {
              var responseClient = {
                reference: requestData.data.reference,
                message: requestData.data.display_text,
                status: requestData.data.status
              }

              var payObj = {
                paidUserId: customerId,
                paidBy: 'CUSTOMER',
                amount: requestData.data.amount,
                reference: requestData.data.reference,
                paymentStatus: 'PENDING'
              }
              var paymentRef = await addPaymentRef(payObj);

              if (paymentRef == 'success') {

                callBack({
                  success: true,
                  STATUSCODE: 201,
                  message: requestData.data.display_text,
                  response_data: responseClient
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

            callBack({
              success: false,
              STATUSCODE: 422,
              message: 'Payment unsuccessful.',
              response_data: {}
            });

          }
        })
      }).on('error', error => {
        console.error(error)
      })
      req.write(params)
      req.end()

    }
  },
  //Get payment bank
  getPaymentBank: (data, callBack) => {
    if (data) {

      var scrtKey = `Bearer ${config.payment.secret_key}`

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/bank',
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
        resp.on('end', () => {
          //  console.log(JSON.parse(data));
          var reqData = JSON.parse(data);

          if (reqData.status == true) {

            var banksArr = [];
            for (let bank of reqData.data) {
              if (bank.pay_with_bank == true) {
                var banksObj = {
                  name: bank.name,
                  code: bank.code,
                  pay_with_bank: bank.pay_with_bank
                }

                banksArr.push(banksObj);
              }


            }
            callBack({
              success: true,
              STATUSCODE: 200,
              message: 'All banks.',
              response_data: { allbanks: banksArr }
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
      }).on('error', error => {
        console.error(error);
        callBack({
          success: false,
          STATUSCODE: 500,
          message: 'Something went wrong.',
          response_data: {}
        });
      })
      req.end()
    }
  },
  //Payment bank
  paymentBank: (datareq, callBack) => {
    if (datareq) {
      var customerId = datareq.body.customerId;
      var bankAccountNo = datareq.body.bankAccountNo;
      var bankCode = datareq.body.bankCode;
      var email = datareq.body.email;
      var amount = datareq.body.amount;
      var birthday = datareq.body.birthday;

      console.log('birthday', birthday);


      var scrtKey = `Bearer ${config.payment.secret_key}`

      //Verify The Account Number
      var urlPath = `/bank/resolve?account_number=${bankAccountNo}&bank_code=${bankCode}`

      console.log('urlPath', urlPath);
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
          console.log(JSON.parse(data))

          var response_data = JSON.parse(data);

          response_data.status = true;

          if (response_data.status == true) {

            const reqParams = JSON.stringify({
              "email": email,
              "amount": amount,
              "metadata": {
                "custom_fields": [
                  {
                    "value": "order in cart",
                    "display_name": "Transfer for",
                    "variable_name": "donation_for"
                  }
                ]
              },
              "bank": {
                "code": bankCode,
                "account_number": bankAccountNo
              },
              "birthday": birthday
            })

            const reqOptions = {
              hostname: 'api.paystack.co',
              port: 443,
              path: '/charge',
              method: 'POST',
              headers: {
                Authorization: scrtKey,
                'Content-Type': 'application/json'
              }
            }
            const request = https.request(reqOptions, response => {
              let reqData = ''
              response.on('data', (reqChunk) => {
                reqData += reqChunk
              });
              response.on('end', async () => {
                console.log(JSON.parse(reqData));

                var requestData = JSON.parse(reqData);

                if (requestData.status == true) {

                  if (requestData.data.status != 'success') {
                    var responseClient = {
                      reference: requestData.data.reference,
                      message: requestData.data.display_text,
                      status: requestData.data.status
                    }

                    console.log('responseClient', responseClient);

                    var payObj = {
                      paidUserId: customerId,
                      paidBy: 'CUSTOMER',
                      amount: requestData.data.amount,
                      reference: requestData.data.reference,
                      paymentStatus: 'PENDING'
                    }

                    console.log('payObj', payObj);
                    var paymentRef = await addPaymentRef(payObj);

                    console.log('paymentRef', paymentRef);

                    if (paymentRef == 'success') {

                      callBack({
                        success: true,
                        STATUSCODE: 201,
                        message: requestData.data.display_text,
                        response_data: responseClient
                      });
                    } else {
                      callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Something went wrong.',
                        response_data: {}
                      });
                    }




                  } else {

                    var paymentRes = {
                      paymentReference: requestData.data.reference,
                      paymentAuthorizationCode: requestData.data.authorization.authorization_code,
                      paymentSignature: requestData.data.authorization.signature,
                      paymentCustomerCode: requestData.data.customer.customer_code,
                      status: requestData.data.status
                    }

                    var payObj = {
                      paidUserId: customerId,
                      paidBy: 'CUSTOMER',
                      amount: requestData.data.amount,
                      reference: requestData.data.reference,
                      paymentStatus: 'COMPLETE'
                    }
                    var paymentRef = await addPaymentRef(payObj);

                    if (paymentRef == 'success') {

                      callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Payment successful.',
                        response_data: paymentRes
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
                  callBack({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Payment failed, please try again.',
                    response_data: {}
                  });
                }
              })
            }).on('error', error => {
              console.error(error);
              callBack({
                success: false,
                STATUSCODE: 500,
                message: 'Something went wrong.',
                response_data: {}
              });
            })
            request.write(reqParams)
            request.end()





          } else {
            callBack({
              success: false,
              STATUSCODE: 500,
              message: 'Please enter valid account information.',
              response_data: {}
            });
          }
        })
      }).on('error', error => {
        console.error(error);
        callBack({
          success: false,
          STATUSCODE: 500,
          message: 'Please enter valid account information',
          response_data: {}
        });
      })
      // req.write()
      req.end()





    }
  },
  //Payment otp
  paymentOtp: (datareq, callBack) => {
    if (datareq) {
      var customerId = datareq.body.customerId;
      var reference = datareq.body.reference;
      var otp = datareq.body.otp;

      var scrtKey = `Bearer ${config.payment.secret_key}`

      const params = JSON.stringify({
        "otp": otp,
        "reference": reference
      })
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/charge/submit_otp',
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
        resp.on('end', async () => {
          console.log(JSON.parse(data));

          var requestData = JSON.parse(data);

          if (requestData.status == true) {

            if (requestData.data.status != 'success') {

              var responseClient = {
                reference: requestData.data.reference,
                message: requestData.data.display_text,
                status: requestData.data.status
              }


              var payObj = {
                paidUserId: customerId,
                paidBy: 'CUSTOMER',
                amount: requestData.data.amount,
                reference: requestData.data.reference,
                paymentStatus: 'PENDING'
              }
              var paymentRef = await addPaymentRef(payObj);

              if (paymentRef == 'success') {

                callBack({
                  success: true,
                  STATUSCODE: 201,
                  message: requestData.data.display_text,
                  response_data: responseClient
                });
              } else {
                callBack({
                  success: false,
                  STATUSCODE: 500,
                  message: 'Something went wrong.',
                  response_data: {}
                });
              }


            } else {

              var paymentRes = {
                paymentReference: requestData.data.reference,
                paymentAuthorizationCode: requestData.data.authorization.authorization_code,
                paymentSignature: requestData.data.authorization.signature,
                paymentCustomerCode: requestData.data.customer.customer_code,
                status: requestData.data.status
              }

              var payObj = {
                paidUserId: customerId,
                paidBy: 'CUSTOMER',
                amount: requestData.data.amount,
                reference: requestData.data.reference,
                paymentStatus: 'COMPLETE'
              }
              var paymentRef = await addPaymentRef(payObj);

              if (paymentRef == 'success') {

                callBack({
                  success: true,
                  STATUSCODE: 200,
                  message: 'Payment successful.',
                  response_data: paymentRes
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
            callBack({
              success: false,
              STATUSCODE: 422,
              message: 'Payment failed, please try again.',
              response_data: {}
            });
          }
        })
      }).on('error', error => {
        console.error(error);
        callBack({
          success: false,
          STATUSCODE: 500,
          message: 'Something went wrong.',
          response_data: {}
        });
      })
      req.write(params)
      req.end()

    }
  },
  //Payment pin
  paymentPin: (datareq, callBack) => {
    if (datareq) {
      var customerId = datareq.body.customerId;
      var reference = datareq.body.reference;
      var pin = datareq.body.pin;

      var scrtKey = `Bearer ${config.payment.secret_key}`

      const params = JSON.stringify({
        "pin": pin,
        "reference": reference
      })
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/charge/submit_pin',
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
        resp.on('end', async () => {
          console.log(JSON.parse(data));

          var requestData = JSON.parse(data);

          if (requestData.status == true) {

            if (requestData.data.status != 'success') {

              var responseClient = {
                reference: requestData.data.reference,
                message: requestData.data.display_text,
                status: requestData.data.status
              }


              var payObj = {
                paidUserId: customerId,
                paidBy: 'CUSTOMER',
                amount: requestData.data.amount,
                reference: requestData.data.reference,
                paymentStatus: 'PENDING'
              }
              var paymentRef = await addPaymentRef(payObj);

              if (paymentRef == 'success') {

                callBack({
                  success: true,
                  STATUSCODE: 201,
                  message: requestData.data.display_text,
                  response_data: responseClient
                });
              } else {
                callBack({
                  success: false,
                  STATUSCODE: 500,
                  message: 'Something went wrong.',
                  response_data: {}
                });
              }


            } else {

              var paymentRes = {
                paymentReference: requestData.data.reference,
                paymentAuthorizationCode: requestData.data.authorization.authorization_code,
                paymentSignature: requestData.data.authorization.signature,
                paymentCustomerCode: requestData.data.customer.customer_code,
                status: requestData.data.status
              }

              var payObj = {
                paidUserId: customerId,
                paidBy: 'CUSTOMER',
                amount: requestData.data.amount,
                reference: requestData.data.reference,
                paymentStatus: 'COMPLETE'
              }
              var paymentRef = await addPaymentRef(payObj);

              if (paymentRef == 'success') {

                callBack({
                  success: true,
                  STATUSCODE: 200,
                  message: 'Payment successful.',
                  response_data: paymentRes
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
            callBack({
              success: false,
              STATUSCODE: 422,
              message: 'Payment failed, please try again.',
              response_data: {}
            });
          }
        })
      }).on('error', error => {
        console.error(error);
        callBack({
          success: false,
          STATUSCODE: 500,
          message: 'Something went wrong.',
          response_data: {}
        });
      })
      req.write(params)
      req.end()

    }
  },
  //Payment phone
  paymentPhone: (datareq, callBack) => {
    if (datareq) {
      var customerId = datareq.body.customerId;
      var reference = datareq.body.reference;
      var phone = datareq.body.phone;

      var scrtKey = `Bearer ${config.payment.secret_key}`

      const params = JSON.stringify({
        "phone": phone,
        "reference": reference
      })
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/charge/submit_phone',
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
        resp.on('end', async () => {
          console.log(JSON.parse(data));

          var requestData = JSON.parse(data);

          if (requestData.status == true) {

            if (requestData.data.status != 'success') {

              var responseClient = {
                reference: requestData.data.reference,
                message: requestData.data.display_text,
                status: requestData.data.status
              }


              var payObj = {
                paidUserId: customerId,
                paidBy: 'CUSTOMER',
                amount: requestData.data.amount,
                reference: requestData.data.reference,
                paymentStatus: 'PENDING'
              }
              var paymentRef = await addPaymentRef(payObj);

              if (paymentRef == 'success') {

                callBack({
                  success: true,
                  STATUSCODE: 201,
                  message: requestData.data.display_text,
                  response_data: responseClient
                });
              } else {
                callBack({
                  success: false,
                  STATUSCODE: 500,
                  message: 'Something went wrong.',
                  response_data: {}
                });
              }


            } else {

              var paymentRes = {
                paymentReference: requestData.data.reference,
                paymentAuthorizationCode: requestData.data.authorization.authorization_code,
                paymentSignature: requestData.data.authorization.signature,
                paymentCustomerCode: requestData.data.customer.customer_code,
                status: requestData.data.status
              }

              var payObj = {
                paidUserId: customerId,
                paidBy: 'CUSTOMER',
                amount: requestData.data.amount,
                reference: requestData.data.reference,
                paymentStatus: 'COMPLETE'
              }
              var paymentRef = await addPaymentRef(payObj);

              if (paymentRef == 'success') {

                callBack({
                  success: true,
                  STATUSCODE: 200,
                  message: 'Payment successful.',
                  response_data: paymentRes
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
            callBack({
              success: false,
              STATUSCODE: 422,
              message: 'Payment failed, please try again.',
              response_data: {}
            });
          }
        })
      }).on('error', error => {
        console.error(error);
        callBack({
          success: false,
          STATUSCODE: 500,
          message: 'Something went wrong.',
          response_data: {}
        });
      })
      req.write(params)
      req.end()

    }
  },
  //Get ussd bank
  getUssdBank: (datareq, callBack) => {
    if (datareq) {

      var ussdBank = [
        {
          bank: 'Guaranty Trust Bank',
          type: '737'
        },
        {
          bank: 'United Bank of Africa',
          type: '919'
        },
        {
          bank: 'Sterling Bank',
          type: '822'
        },
        {
          bank: 'Zenith Bank',
          type: '966'
        }
      ]

      callBack({
        success: true,
        STATUSCODE: 200,
        message: 'All banks ussd.',
        response_data: { allbanks: ussdBank }
      });

    }
  },
  //Payment ussd
  paymentUssd: (datareq, callBack) => {
    if (datareq) {
      var customerId = datareq.body.customerId;
      var ussdType = datareq.body.ussdType;
      var email = datareq.body.email;
      var amount = datareq.body.amount;

      var scrtKey = `Bearer ${config.payment.secret_key}`

      const params = JSON.stringify({
        "email": email,
        "amount": amount,
        "ussd": {
          "type": ussdType
        },
        "metadata": {
          "custom_fields": [{
            "value": "makurdi",
            "display_name": "Transfer for",
            "variable_name":
              "donation_for"
          }]
        }
      })
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/charge',
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
        resp.on('end', async () => {
          console.log(JSON.parse(data));

          var requestData = JSON.parse(data);

          if (requestData.status == true) {

            if (requestData.data.status == 'pay_offline') {

              var respClient = {
                reference: requestData.data.reference,
                display_text: requestData.data.display_text,
                ussdCode: requestData.data.ussd_code,
                status: requestData.data.status
              }

              var payObj = {
                paidUserId: customerId,
                paidBy: 'CUSTOMER',
                amount: amount,
                reference: requestData.data.reference,
                paymentStatus: 'PENDING'
              }
              var paymentRef = await addPaymentRef(payObj);

              if (paymentRef == 'success') {

                callBack({
                  success: true,
                  STATUSCODE: 200,
                  message: requestData.data.display_text,
                  response_data: respClient
                });
              } else {
                callBack({
                  success: false,
                  STATUSCODE: 500,
                  message: 'Something went wrong.',
                  response_data: {}
                });
              }





            } else {
              callBack({
                success: false,
                STATUSCODE: 422,
                message: 'Payment failed, please try again.',
                response_data: {}
              });
            }
          } else {
            callBack({
              success: false,
              STATUSCODE: 422,
              message: 'Payment failed, please try again.',
              response_data: {}
            });
          }
        })
      }).on('error', error => {
        console.error(error);
        callBack({
          success: false,
          STATUSCODE: 500,
          message: 'Something went wrong.',
          response_data: {}
        });
      })
      req.write(params)
      req.end()

    }
  },
  //webhook data
  getPaymentResponse: async (req, callBack) => {
    if (req) {

      var crypto = require('crypto');

      var secret = `${config.payment.secret_key}`;

      //validate event
      var hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
      if (hash == req.headers['x-paystack-signature']) {
        // Retrieve the request's body
        var eventRes = req.body;

        if (eventRes.event == 'charge.success') {
          var payObj = {
            reference: eventRes.data.reference,
            amount: eventRes.data.amount,
            paymentStatus: 'COMPLETE'
          }
          var paymentRef = await addPaymentRef(payObj);

          if (paymentRef == 'success') {

            callBack({
              success: true,
              STATUSCODE: 200,
              message: 'Payment successful.',
              response_data: {}
            });
          }

        } else if (eventRes.event == 'transfer.success') {

          var transferCode = eventRes.data.transfer_code;

          paymentSchema.findOne({ vendorPaymentTransferCode: transferCode })
            .then((paymntRes) => {

              if (paymntRes != null) {

                var paymentId = paymntRes._id;

                var orderId = paymntRes.orderId;

                var updatePayment = {
                  vendorPaymentStatus: 'COMPLETE'
                }

                paymentSchema.updateOne({ _id: paymentId }, {
                  $set: updatePayment
                }, function (err, paymentres) {
                  if (err) {
                    console.log(err);
                  } else {
                    if (paymentres.nModified == 1) {
                      console.log('Transfer success');

                      orderSchema.updateOne({ _id: orderId }, {
                        $set: { paymentStatus: 'COMPLETE' }
                      });



                      callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Payment successful.',
                        response_data: {}
                      });
                    }
                  }
                });

              }

            });



        }

        console.log('event', eventRes);
        // Do something with event  
      }

    }
  },
  //RESTAURANT
  //Sub account create/update
  subaccountCreate: (data, callBack) => {
    if (data) {

      var accountData = data.headers.data;

      const crypto = require('crypto');
      const key = config.payment.encryptedKey;
      const IV = config.payment.ivCode;

      var decrypt = ((encrypted) => {
        let decipher = crypto.createDecipheriv('aes-256-cbc', key, IV);
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        return (decrypted + decipher.final('utf8'));
      });

      var reqBodyStr = decrypt(accountData);

      console.log('reqBodyStr', reqBodyStr);

      var reqBody = JSON.parse(reqBodyStr);

      console.log('reqBody', reqBody);


      var vendorId = reqBody.vendorId


      vendorSchema.findOne({ _id: vendorId })
        .then(async (customer) => {
          if (customer != null) {

            // var aes256 = require('aes256');




            var decryptedbankCode = reqBody.bankCode;
            var decryptedaccountNo = reqBody.accountNo;
            var decryptedbusinessName = reqBody.businessName;


            var scrtKey = `Bearer ${config.payment.secret_key}`

            var urlPath = `/bank/resolve?account_number=${decryptedaccountNo}&bank_code=${decryptedbankCode}`

            console.log('urlPath', urlPath);
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
                console.log(JSON.parse(data))

                var response_data = JSON.parse(data);

                if (response_data.status == true) {

                  var vendorAccountObj = {
                    vendorId: vendorId,
                    accountNo: decryptedaccountNo,
                    bankCode: decryptedbankCode,
                    businessName: decryptedbusinessName,
                    accountName: response_data.data.account_name,
                    isActive: false,
                    isCurrent: true
                  }

                  var vendrAccount = await vendorAccountSchema.findOne({ vendorId: vendorId, isCurrent: true });

                  if (vendrAccount != null) {

                    if ((vendrAccount.accountNo != vendorAccountObj.accountNo) || (vendrAccount.bankCode != vendorAccountObj.bankCode) || (vendrAccount.businessName != vendorAccountObj.businessName)) {
                      vendorAccountObj.isActive = false

                      //SAVE HISTORY ACCOUNT START
                      var vendorNewAccountObj = {
                        vendorId: vendorId,
                        accountNo: vendrAccount.accountNo,
                        bankCode: vendrAccount.bankCode,
                        businessName: vendrAccount.businessName,
                        accountName: vendrAccount.accountName,
                        isActive: false,
                        isCurrent: false
                      }


                      vendorAccountSchema.updateOne({ _id: vendrAccount._id }, {
                        $set: vendorNewAccountObj
                      }, function (err, res) {
                        if (err) {
                          console.log(err);
                          callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Please enter valid account information',
                            response_data: {}
                          });
                        } else {
                          if (res.nModified == 1) {

                            //SAVE LOG
                            var logObj = {
                              vendorId: reqBody.vendorId,
                              type: 'Restaurant Bank Account Update',
                              log: `Restaurant updated their bank details`,
                              addedTime: new Date()
                            }
                            saveVendorLog(logObj);

                            new vendorAccountSchema(vendorAccountObj).save(async function (err, result) {
                              if (err) {
                                console.log(err);
                                callBack({
                                  success: false,
                                  STATUSCODE: 500,
                                  message: 'Internal DB error',
                                  response_data: {}
                                });
                              } else {

                                callBack({
                                  success: true,
                                  STATUSCODE: 200,
                                  message: 'Account information updated successfully',
                                  response_data: vendrAccount
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

                        }
                      });

                      //SAVE HISTORY ACCOUNT END




                    } else {
                      vendorAccountObj.isActive = true;

                      vendorAccountSchema.updateOne({ _id: vendrAccount._id }, {
                        $set: vendorAccountObj
                      }, function (err, res) {
                        if (err) {
                          console.log(err);
                          callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Please enter valid account information',
                            response_data: {}
                          });
                        } else {
                          if (res.nModified == 1) {

                            //SAVE LOG
                            var logObj = {
                              vendorId: reqBody.vendorId,
                              type: 'Restaurant Bank Account Update',
                              log: `Restaurant updated their bank details`,
                              addedTime: new Date()
                            }
                            saveVendorLog(logObj);

                            callBack({
                              success: true,
                              STATUSCODE: 200,
                              message: 'Account information updated successfully',
                              response_data: vendrAccount
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



                  } else {

                    vendorAccountObj.isCurrent = true;
                    new vendorAccountSchema(vendorAccountObj).save(async function (err, result) {
                      if (err) {
                        console.log(err);
                        callBack({
                          success: false,
                          STATUSCODE: 500,
                          message: 'Internal DB error',
                          response_data: {}
                        });
                      } else {
                        //SAVE LOG
                        var logObj = {
                          vendorId: reqBody.vendorId,
                          type: 'Restaurant Bank Account Add',
                          log: `Restaurant added their bank details`,
                          addedTime: new Date()
                        }
                        saveVendorLog(logObj);

                        callBack({
                          success: true,
                          STATUSCODE: 200,
                          message: 'Account information added successfully',
                          response_data: result
                        });
                      }
                    });
                  }



                } else {
                  callBack({
                    success: false,
                    STATUSCODE: 500,
                    message: 'Please enter valid account information.',
                    response_data: {}
                  });
                }
              })
            }).on('error', error => {
              console.error(error);
              callBack({
                success: false,
                STATUSCODE: 500,
                message: 'Please enter valid account information',
                response_data: {}
              });
            })
            // req.write()
            req.end()
          } else {
            callBack({
              success: false,
              STATUSCODE: 422,
              message: 'User not found.',
              response_data: {}
            });
          }
        }).catch((err) => {
          console.log(err);
          callBack({
            success: false,
            STATUSCODE: 500,
            message: 'Please enter valid account information.',
            response_data: {}
          });
        })


    }
  },
  //get sub account
  getSubAccount: (data, callBack) => {
    if (data) {

      var vendorId = data.body.vendorId;

      // var aes256 = require('aes256');

      const crypto = require('crypto');
      const key = config.payment.encryptedKey; // set random encryption key
      const IV = config.payment.ivCode; // set random initialisation vector


      vendorSchema.findOne({ _id: vendorId })
        .then(async (customer) => {
          if (customer != null) {

            vendorAccountSchema.findOne({ vendorId: vendorId, isCurrent: true })
              .then(async (account) => {

                if (account == null) {
                  var mAccount = {};
                } else {
                  mAccount = {
                    vendorId: account.vendorId,
                    accountNo: account.accountNo,
                    businessName: account.businessName,
                    bankCode: account.bankCode

                  }
                }

                var bankAccountObj = await bankAccountSchema.find(
                  {}
                  , { "bankName": 1, "bankCode": 1 });

                var response = {
                  bank: bankAccountObj,
                  account: mAccount
                }

                console.log(response);


                var responseTotal = {
                  success: true,
                  STATUSCODE: 200,
                  message: 'Account information',
                  response_data: response
                }

                var responseTotalStr = JSON.stringify(responseTotal);


                var encrypt = ((val) => {
                  let cipher = crypto.createCipheriv('aes-256-cbc', key, IV);
                  let encrypted = cipher.update(val, 'utf8', 'base64');
                  encrypted += cipher.final('base64');
                  return encrypted;
                });

                // var decrypt = ((encrypted) => {
                //   let decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, IV);
                //   let decrypted = decipher.update(encrypted, 'base64', 'utf8');
                //   return (decrypted + decipher.final('utf8'));
                // });



                var encrypted_key = encrypt(responseTotalStr);
                // var original_phrase = decrypt(encrypted_key);




                callBack({ data: encrypted_key });

              }).catch((err) => {
                console.log(err);
                callBack({
                  success: false,
                  STATUSCODE: 500,
                  message: 'Something went wrong.',
                  response_data: {}
                });
              })




          } else {
            callBack({
              success: false,
              STATUSCODE: 422,
              message: 'User not found.',
              response_data: {}
            });
          }
        }).catch((err) => {
          console.log(err);
          callBack({
            success: false,
            STATUSCODE: 500,
            message: 'Something went wrong.',
            response_data: {}
          });
        })


    }
  },

}

function addPaymentRef(payObj) {

  return new Promise(async function (resolve, reject) {

    var reference = payObj.reference;

    paymentReferenceSchema
      .findOne({ reference: reference })
      .then(async (payref) => {

        if (payref != null) { //UPDATE REFERENCE

          paymentReferenceSchema.updateOne({ _id: payref._id }, {
            $set: payObj
          }, function (err, res) {
            if (err) {
              console.log(err);
              return resolve('error');
            } else if (res.nModified == 1) {
              return resolve('success');
            } else {
              return resolve('error');
            }

          });



        } else { //ADD REFERENCE
          new paymentReferenceSchema(payObj).save(async function (err, result) {
            if (err) {
              console.log(err);
              return resolve('error');
            } else {
              return resolve('success');
            }
          });
        }

      })



  });

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