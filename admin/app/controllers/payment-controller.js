const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const mail = require('../../modules/sendEmail');
const { SERVERURL, HOST, PORT, SERVERIMAGEPATH, SERVERIMAGEUPLOADPATH, PAYSTACK_SK } = require('../../config/bootstrap');
//Session
var session = require('express-session');

var vendorSchema = require('../../schema/Vendor');
var paymentSchema = require('../../schema/Payment');
var orderSchema = require('../../schema/Order');
var vendorPaymentSettingSchema = require('../../schema/VendorPaymentSetting');
var vendorAccountSchema = require('../../schema/VendorAccount');



module.exports.paymentList = async (req, res) => {
    var user = req.session.user;
    var paymentType = 'ALL'
    var vendorId = ''
    var customerId = ''

    var orderObj = {};
    var paymentObj = {};

    var toDateNw = new Date();
    var fromDateNw = new Date();
    fromDateNw.setDate(fromDateNw.getDate() - 10);

    var fromDate = req.query.from;
    var toDate = req.query.to;

    if (fromDate == undefined) {
        fromDate = listDateFilter(fromDateNw);
    } else {
        fromDateNw = createDateFormat(fromDate,1)

    }

    if (toDate == undefined) {
        toDate = listDateFilter(toDateNw);
    } else {
        toDateNw = createDateFormat(toDate,2)
    }

    paymentObj.createdAt = { $gte: fromDateNw, $lte: toDateNw }


    var reqQueryPaymentType = req.query.paymentType;
    if ((reqQueryPaymentType != undefined) && (reqQueryPaymentType != '') && (reqQueryPaymentType != 'all')) {
        paymentType = reqQueryPaymentType;
        orderObj.paymentType = paymentType;
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


    var orders = await orderSchema.find(orderObj);

    //console.log(orders);
    var orderIdArr = [];
    if (orders.length > 0) {
        for (let order of orders) {
            console.log('orderIds', order._id);
            orderIdArr.push((order._id).toString());
        }
    }

    paymentObj.orderId = { $in: orderIdArr };

    var searchVal = req.query.search;
    //SEARCH
    var orCondSearch = [];
    var searchTxt = '';
    if ((searchVal != undefined) && (searchVal != '')) {

        //var searchTxt = { $text: { $search: searchVal } };
        //SEARCH BY PICKUP LOCATION
        var orpickupLocationobj = {
            // pickupLocation: { $regex: '.*' + searchVal + '.*' }
            customerPaymentReference: { '$regex': searchVal, '$options': 'i' }

        };

        orCondSearch.push(orpickupLocationobj);

        //SEARCH BY DESTINATION LOCATION
        var orpdestinationLocationobj = {
            // destinationLocation: { $regex: '.*' + searchVal + '.*' }
            vendorPaymentStatus: { '$regex': searchVal, '$options': 'i' }
        };

        orCondSearch.push(orpdestinationLocationobj);

        var paymentObj = {
            $or: orCondSearch
        }

        searchTxt = searchVal;
    }

    paymentSchema.find(paymentObj)
        .sort({ createdAt: -1 })
        .then(async (payments) => {
            var paymentArr = [];
            if (payments.length > 0) {
                for (let payment of payments) {
                    var paymentObj = {
                        _id: payment._id,
                        totalAmount: payment.totalAmount,
                        customerPaymentReference: payment.customerPaymentReference,
                        vendorPaymentReference: payment.vendorPaymentReference,
                        vendorAmount: payment.vendorAmount,
                        customerPaymentTime: listDateFormat(payment.customerPaymentTime),
                        vendorPaymentTime: listDateFormat(payment.vendorPaymentTime),
                    }

                    paymentObj.orderInfo = await orderSchema.findOne({ _id: payment.orderId });
                    paymentObj.vendorInfo = await vendorSchema.findOne({ _id: payment.vendorId });

                    paymentArr.push(paymentObj);
                }
            }

            // console.log(paymentArr);
            // return;

            // var imagePath = `${SERVERIMAGEPATH}vendor/`

            var vendors = await vendorSchema.find({ isDisabled: { $ne: true } });

            console.log('vendorId', vendorId);

            res.render('payment/list.ejs', {
                paymentArr: paymentArr,
                layout: false,
                user: user,
                vendors: vendors,
                paymentType: paymentType,
                vendorId: vendorId,
                customerId: customerId,
                fromDate: fromDate,
                toDate: toDate,
                searchTxt: searchTxt
            });
        });
}

module.exports.sendReceiptEmail = (req, res) => {

    var paymentId = req.body.paymentId;

    console.log('paymentId', paymentId);
    // return;

    // console.log(vendorId);


    paymentSchema
        .findOne({ _id: paymentId })
        .then(async (paymentDetails) => {

            if (paymentDetails != null) {

                var paymentSettings = await vendorPaymentSettingSchema.findOne({ _id: paymentDetails.vendorId });

                if ((paymentSettings != null) && (paymentSettings.sendPaymentEmail != 'INACTIVE')) {

                    // console.log(paymentDetails);
                    // return;

                    var orderInfo = await orderSchema.findOne({ _id: paymentDetails.orderId });

                    var vendorInfo = await vendorSchema.findOne({ _id: paymentDetails.vendorId });

                    // console.log(orderInfo);
                    // return;

                    var paymentData = {
                        orderNo: orderInfo.orderNo,
                        orderTime: listDateFormat(orderInfo.orderTime),
                        totalAmount: paymentDetails.totalAmount

                    }

                    // console.log(userData);
                    var userEmail = vendorInfo.contactEmail;

                    console.log('userEmail', userEmail);

                    try {
                        mail('paymentReceipt')(userEmail, paymentData).send();

                        var responseObj = {
                            msg: 'Payment receipt email send successfully.',
                            body: {},
                            statusCode: 422
                        };
                        res.status(200).json(responseObj)
                    } catch (Error) {
                        console.log('error', error);

                        var responseObj = { msg: 'Something went wrong.' };

                        res.status(500).json(responseObj)
                    }
                } else {
                    var responseObj = { msg: 'Payment send email is Inactive.', statusCode: 422 };
                    res.status(200).json(responseObj)
                }


            }

        })
        .catch((error) => {
            console.log('error', error);

            var responseObj = { msg: 'Something went wrong.' };

            res.status(500).json(responseObj)

        })

}

module.exports.sendVendorAmount = (req, res) => {

    var paymentId = req.body.paymentId;
    var amount = req.body.amount;

    console.log('paymentId', paymentId);
    // return;

    // console.log(vendorId);

    paymentSchema.findOne({ _id: paymentId })
        .then((payment) => {

            var orderId = payment.orderId;
            //, paymentStatus: 'CUSTOMER_PAID', orderStatus: 'COMPLETED' 
            orderSchema
                .findOne({ _id: orderId })
                .then(async (order) => {


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

                    //  console.log('----2',order._id);
                    paymentSchema
                        .findOne({ orderId: orderId, vendorPaymentStatus: 'INITIATE' })  //ADMIN MANUALLY NOT PAID
                        .then(async (vendorPayment) => {

                            if (vendorPayment != null) {

                                console.log('----3', vendorPayment);

                                var paymentId = vendorPayment._id;

                                vendorAccountSchema
                                    .findOne({ vendorId: order.vendorId, isActive: true })  //FETCH VENDOR ACCOUNT
                                    .then(async (vendorAccount) => {

                                        if (vendorAccount != null) {

                                            const https = require('https');

                                            var scrtKey = `Bearer ${PAYSTACK_SK}`;
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

                                                    console.log('vendorPayment.amount', vendorPayment.totalAmount);

                                                    if (transferReceipt.status == true) {
                                                        var transferReceiptCode = transferReceipt.data.recipient_code;
                                                        var transferAmount = Math.round(Number(Number(amount) * 100));
                                                        var transferReason = `Transfer for order no ${order.orderNo}`;

                                                        console.log('transferAmount', transferAmount);


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
                                                                console.log(JSON.parse(transdata));
                                                                var transferComplete = JSON.parse(transdata);

                                                                console.log('transferComplete', transferComplete);


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
                                                                            console.log(err);

                                                                            var responseObj = { msg: 'Please put the OTP send to your mobile.', statusCode: 200 };
                                                                            res.status(200).json(responseObj)
                                                                        } else {
                                                                            if (paymentres.nModified == 1) {
                                                                                console.log('Transfer success');

                                                                                var responseObj = { msg: 'Please put the OTP send to your mobile.', statusCode: 200 };
                                                                                res.status(200).json(responseObj)
                                                                            }
                                                                        }
                                                                    });
                                                                } else {
                                                                    var responseObj = { msg: 'Payment failed.', statusCode: 422 };
                                                                    res.status(200).json(responseObj)
                                                                }


                                                            })
                                                        }).on('error', error => {
                                                            console.error(error)
                                                        })
                                                        transreq.write(transparams)
                                                        transreq.end()
                                                    } else {
                                                        var responseObj = { msg: 'Bank transfer failed.', statusCode: 422 };
                                                        res.status(200).json(responseObj)
                                                    }
                                                })
                                            }).on('error', error => {
                                                console.error(error)
                                            })
                                            req.write(params)
                                            req.end()

                                        } else {

                                            var responseObj = { msg: 'No Bank account added of this restaurant.', statusCode: 422 };
                                            res.status(200).json(responseObj)
                                        }

                                    }).catch((err) => {
                                        console.log(err);

                                        var responseObj = { msg: 'Something went wrong.', statusCode: 422 };
                                        res.status(200).json(responseObj)

                                    })



                            } else {
                                var responseObj = { msg: 'This restaurant already get its comission.', statusCode: 422 };
                                res.status(200).json(responseObj)
                            }
                        }).catch((err) => {
                            console.log(err);

                            var responseObj = { msg: 'Something went wrong.', statusCode: 422 };
                            res.status(200).json(responseObj)

                        })



                }).catch((err) => {
                    console.log(err);

                    var responseObj = { msg: 'Something went wrong.', statusCode: 422 };
                    res.status(200).json(responseObj)
                })

        })





}

module.exports.sendOTP = (req, res) => {

    var paymentId = req.body.paymentId;
    var otp = req.body.otp;

    console.log('paymentId', paymentId);
    // return;

    // console.log(vendorId);

    paymentSchema.findOne({ _id: paymentId })
        .then((payment) => {

            var reference = payment.vendorPaymentReference;

            var scrtKey = `Bearer ${PAYSTACK_SK}`

            console.log('reference', reference);

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

            const https = require('https');

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
                            var responseObj = { msg: 'Something went wrong.', statusCode: 422 };
                            res.status(200).json(responseObj)

                        } else {
                            var responseObj = { msg: 'Payment successfully.', statusCode: 200 };
                            res.status(200).json(responseObj)



                        }
                    } else {

                        var responseObj = { msg: 'Payment failed, please try again.', statusCode: 422 };
                        res.status(200).json(responseObj)
                    }
                })
            }).on('error', error => {
                console.error(error);

                var responseObj = { msg: 'Something went wrong.', statusCode: 422 };
                res.status(200).json(responseObj)
            })
            req.write(params)
            req.end()

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


function createDateFormat(reqDate,type) {
    var date = reqDate;

    var monthsTOneArr = [1, 3, 5, 7, 8, 10, 12];

    var dateSpl = date.split("/");

    var month = dateSpl[1];
    var day = dateSpl[0];
    var year = dateSpl[2];




    if(type == 1) {
        var dateNew = new Date(`${month}-${day}-${year} 00:00:00`);
    } else {
        var dateNew = new Date(`${month}-${day}-${year} 23:59:59`);
    }

    return dateNew;

}




