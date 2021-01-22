var jwt = require('jsonwebtoken');
const config = require('../config');
var customerSchema = require('../schema/Customer');
/**
 * @developer : Subhajit Singha
 * @date : 20th February 2020
 * @description : Middleware function for validating request data and JWT token.
 */
exports.validateToken = async (req, res, next) => {

    var whitelistUrl = ['/api/customer/dashboard', '/api/customer/vendorDetails', '/api/customer/postOrder', '/api/customer/orderList', '/api/customer/orderDetails', '/api/customer/search', '/api/customer/submitReview', , '/api/customer/vendorCategories']

    if (req.body.userType == 'GUEST') {
        next();
    } else {
        var token = req.headers['authorization'];
        if (token) {
            if (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
                // Remove Bearer from string
                token = token.slice(7, token.length);
            }
            // decode token
            if (token) {
                jwt
                    .verify(token, config.secretKey, function (err, decoded) {
                        if (err) {
                            res.status(401).send({
                                success: false,
                                STATUSCODE: 401,
                                message: 'Token not valid',
                                response_data: {}
                            });
                        }
                        else {
                            console.log(decoded)
                            //VALID USER CHECK
                            if (req.body.customerId != decoded.subject) {
                                res.status(401).send({
                                    success: false,
                                    STATUSCODE: 401,
                                    message: 'Request info not valid',
                                    response_data: {}
                                });
                            } else {
                                next();
                            }
                        }
                    });

            } else {
                res.status(401).send({
                    success: false,
                    STATUSCODE: 401,
                    message: 'Token format not valid',
                    response_data: {}
                });

            }
        } else {
            res.status(401).send({
                success: false,
                STATUSCODE: 401,
                message: 'Token format not valid',
                response_data: {}
            });

        }
    }


}

exports.checkCustomer = async (req, res, next) => {
    if (req.body.userType == 'CUSTOMER') {

        var customerId = req.body.customerId;

        var customerCond = {
            _id: customerId,
            isDeleted: { $ne: true },
            isActive: { $ne: false }
        };

        customerSchema.findOne(customerCond)
            .then(async (customer) => {
                if (customer != null) {
                    next();
                } else {
                    res.status(200).send({
                        success: false,
                        STATUSCODE: 420,
                        message: 'User deleted',
                        response_data: {}
                    });
                }
            });

    } else {
        next();
    }



}