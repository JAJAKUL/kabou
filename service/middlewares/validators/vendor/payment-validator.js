var joi = require('@hapi/joi');

module.exports = {
    subaccountCreate: async (req, res, next) => {
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is required')),
            vendorId: joi.string().required().error(new Error('Vendor id is required')),
            bankCode: joi.string().required().error(new Error('Bank code required')),
            accountNo: joi.string().required().error(new Error('Account no is required')),
            businessName: joi.string().required().error(new Error('Business name is required')),
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(200).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            next();
        }
    },
    getSubAccount: async (req, res, next) => {
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is required')),
            vendorId: joi.string().required().error(new Error('Vendor id is required'))
        });

        const value = await rules.validate(req.body);
        if (value.error) {
            res.status(200).json({
                success: false,
                STATUSCODE: 422,
                message: value.error.message
            })
        } else {
            next();
        }
    }
}