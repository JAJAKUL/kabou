var joi = require('@hapi/joi');

module.exports = {
    paymentInitialize: async (req, res, next) => {
        var userTypeVal = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userTypeVal).error(new Error('Guest user is not allowed')),
            amount: joi.string().required().error(new Error('Amount required')),
            email: joi.string().email().error(new Error('Valid email is required'))
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(422).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            var customerId = req.body.customerId;
            var userType = req.body.userType;
            if ((userType == 'CUSTOMER') && (customerId == '')) {
                res.status(422).json({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Customer Id is required'
                })
            } else {
                next();
            }
        }
    },
    paymentVerify: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            amount: joi.string().required().error(new Error('Amount required')),
            reference: joi.string().required().error(new Error('Reference is  required')),
            email: joi.string().email().error(new Error('Valid email is required'))
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(422).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            var customerId = req.body.customerId;
            var userType = req.body.userType;
            if ((userType == 'CUSTOMER') && (customerId == '')) {
                res.status(422).json({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Customer Id is required'
                })
            } else {
                next();
            }
        }
    },
    paymentCards: async (req, res, next) => {
        var userType = ['CUSTOMER']
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is  required')),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(422).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            next();
        }
    },
    paymentRecurring: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is  required')),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            amount: joi.string().required().error(new Error('Amount required')),
            email: joi.string().email().error(new Error('Valid email is required')),
            authorizationCode: joi.string().required().error(new Error('Auth code is required'))
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(422).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            next();
        }
    },
    paymentBank: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            amount: joi.string().required().error(new Error('Amount required')),
            email: joi.string().email().error(new Error('Valid email is required')),
            bankAccountNo: joi.string().required().error(new Error('Bank account no is required')),
            bankCode: joi.string().required().error(new Error('Bank code is required')),
            birthday: joi.string().required().error(new Error('Birthday is required'))
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(422).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            var customerId = req.body.customerId;
            var userType = req.body.userType;
            if ((userType == 'CUSTOMER') && (customerId == '')) {
                res.status(422).json({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Customer Id is required'
                })
            } else {
                next();
            }
        }
    },
    paymentOtp: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            reference: joi.string().required().error(new Error('Reference is  required')),
            otp: joi.string().required().error(new Error('Otp is required'))
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(422).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            var customerId = req.body.customerId;
            var userType = req.body.userType;
            if ((userType == 'CUSTOMER') && (customerId == '')) {
                res.status(422).json({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Customer Id is required'
                })
            } else {
                next();
            }
        }
    },
    paymentPin: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            reference: joi.string().required().error(new Error('Reference is  required')),
            pin: joi.string().required().error(new Error('Otp is required'))
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(422).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            var customerId = req.body.customerId;
            var userType = req.body.userType;
            if ((userType == 'CUSTOMER') && (customerId == '')) {
                res.status(422).json({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Customer Id is required'
                })
            } else {
                next();
            }
        }
    },
    paymentPhone: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            reference: joi.string().required().error(new Error('Reference is  required')),
            phone: joi.string().required().error(new Error('Phone is required'))
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(422).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            var customerId = req.body.customerId;
            var userType = req.body.userType;
            if ((userType == 'CUSTOMER') && (customerId == '')) {
                res.status(422).json({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Customer Id is required'
                })
            } else {
                next();
            }
        }
    },
    getUssdBank: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed'))
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(422).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            var customerId = req.body.customerId;
            var userType = req.body.userType;
            if ((userType == 'CUSTOMER') && (customerId == '')) {
                res.status(422).json({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Customer Id is required'
                })
            } else {
                next();
            }
        }
    },
    paymentUssd: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            amount: joi.string().required().error(new Error('Amount required')),
            email: joi.string().email().error(new Error('Valid email is required')),
            ussdType: joi.string().required().error(new Error('Ussd type is required'))
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(422).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            var customerId = req.body.customerId;
            var userType = req.body.userType;
            if ((userType == 'CUSTOMER') && (customerId == '')) {
                res.status(422).json({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Customer Id is required'
                })
            } else {
                next();
            }
        }
    }
}