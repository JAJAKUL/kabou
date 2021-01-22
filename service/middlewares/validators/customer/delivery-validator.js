var joi = require('@hapi/joi');

module.exports = {
    checkFare: async (req, res, next) => {
        var userType = ['CUSTOMER','GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            vendorId: joi.string().required().error(new Error('Vendor Id is required')),
            deliveryLat: joi.string().required().error(new Error('Delivery lat is required')),
            deliveryLong: joi.string().required().error(new Error('Delivery long is required'))
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
            if((userType == 'CUSTOMER') && (customerId == '')) {
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
    orderTrack: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            orderId: joi.string().required().error(new Error('Please send order Id'))
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