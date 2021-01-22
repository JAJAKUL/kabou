var joi = require('@hapi/joi');

module.exports = {
    dashboard: async (req, res, next) => {
        const appTypeVal = ["ANDROID", "IOS"];
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer Id is required')),
            appType: joi.string().required().valid(...appTypeVal).error(new Error('App type required'))
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
    availabilityChange: async (req, res, next) => {
        const appTypeVal = ["ANDROID", "IOS"];
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer Id is required')),
            appType: joi.string().required().valid(...appTypeVal).error(new Error('App type required')),
            availability: joi.boolean().required().error(new Error('Availbility required'))
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
    acceptRejectChange: async (req, res, next) => {
        const appTypeVal = ["ANDROID", "IOS"];
        const acceptTypeVal = ["ACCEPTED", "REJECTED"];
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer Id is required')),
            appType: joi.string().required().valid(...appTypeVal).error(new Error('App type required')),
            acceptReject: joi.string().required().valid(...acceptTypeVal).error(new Error('Accept/Reject required')),
            deliveryOrderId: joi.string().required().error(new Error('Delivery order Id is required'))
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
    orderDetails: async (req, res, next) => {
        const appTypeVal = ["ANDROID", "IOS"];
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer Id is required')),
            appType: joi.string().required().valid(...appTypeVal).error(new Error('App type required')),
            deliveryOrderId: joi.string().required().error(new Error('Delivery order Id is required'))
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
    postLatLong: async (req, res, next) => {
        const appTypeVal = ["ANDROID", "IOS"];
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer Id is required')),
            appType: joi.string().required().valid(...appTypeVal).error(new Error('App type required')),
            deliveryOrderId: joi.string().required().error(new Error('Delivery order Id is required')),
            lat: joi.string().required().error(new Error('Lattitude is required')),
            long: joi.string().required().error(new Error('Lonngitude is required'))
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
    orderStatus: async (req, res, next) => {
        const appTypeVal = ["ANDROID", "IOS"];
        const statusVal = ["COLLECTED"];
        const rules = joi.object({ 
            customerId: joi.string().required().error(new Error('customer Id is required')),
            appType: joi.string().required().valid(...appTypeVal).error(new Error('App type required')),
            deliveryOrderId: joi.string().required().error(new Error('Delivery order Id is required')),
            orderStatus: joi.string().required().valid(...statusVal).error(new Error('Please Select order status')),
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
}