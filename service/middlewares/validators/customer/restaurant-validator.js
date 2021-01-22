var joi = require('@hapi/joi');

module.exports = {
    customerHomeValidator: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        var sortParam = ['DISTANCE', 'POPULARITY','RATING']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            latitude: joi.string().required().error(new Error('Latitude required')),
            longitude: joi.string().required().error(new Error('Longitude required')),
            categoryId: joi.string().required().error(new Error('Category Id is required')),
            sort: joi.string().valid(...sortParam).allow('').optional(),
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
    },
    restaurantDetailsValidator: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST'];
        var sortParam = ['PRICE_ASC','PRICE_DESC', 'POPULARITY','DISCOUNT'];
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            categoryId: joi.string().required().error(new Error('Category Id is required')),
            vendorId: joi.string().required().error(new Error('vendor Id is required')),
            restaurantInfo: joi.string().required().error(new Error('Need Restaurant info')),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            latitude: joi.string().required().error(new Error('Latitude required')),
            longitude: joi.string().required().error(new Error('Longitude required')),
            sort: joi.string().valid(...sortParam).allow('').optional(),
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
    },
    vendorCategories: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
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
    },
    postOrderValidator: async (req, res, next) => {

        var userType = ['CUSTOMER', 'GUEST']
        const appTypeVal = ["ANDROID", "IOS", "BROWSER"];
        const deliveryPreferenc = ["DELIVERY", "PICKUP"];
        const paymentTypeVal = ["CARD","USSD","BANK_TRANSFER"];
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            appType: joi.string().required().valid(...appTypeVal).error(new Error('App type required')),
            vendorId: joi.string().required().error(new Error('vendor Id is required')),
            deliveryHouseNo: joi.string().allow('').optional(),
            deliveryCountryCode: joi.string().allow('').optional(),
            deliveryPhone: joi.string().allow('').optional(),
            deliveryLandmark: joi.string().allow('').optional(),
            deliveryAddressType: joi.string().allow('').optional(),
            deliveryFullAddress: joi.string().allow('').optional(),
            deliveryLat: joi.string().allow('').optional(),
            deliveryLong: joi.string().allow('').optional(),
            
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            guestEmail: joi.string().email().allow('').optional(),
            guestCountryCode: joi.string().allow('').optional(),
            guestPhone: joi.string().allow('').optional(),
            guestName: joi.string().allow('').optional(),

            deliveryPreference: joi.string().valid(...deliveryPreferenc).required().error(new Error('Please send deliveryPreference')),
            paymentType: joi.string().valid(...paymentTypeVal).required().error(new Error('Please send paymentType')),
            orderType: joi.string().required().error(new Error('Please send orderType')),
            price: joi.string().required().error(new Error('Please enter price')),
            discount: joi.string().allow('').optional(),
            finalPrice: joi.string().required().error(new Error('Please enter final price')),
            specialInstruction: joi.string().allow('').optional(),
            promocodeId: joi.string().allow('').optional(),
            promocode: joi.string().allow('').optional(),
            offerId: joi.string().allow('').optional(),
            estimatedDeliveryTime: joi.string().required().error(new Error('Estimated delivery time is required')),
            foodReadyTime: joi.string().required().error(new Error('Food ready delivery time is required')),
            deliveryTime: joi.string().required().error(new Error('Delivery time is required')),
            items: joi.any().required().error(new Error('Item information required')),
            latitude: joi.string().required().error(new Error('Latitude required')),
            longitude: joi.string().required().error(new Error('Longitude required')),
            itemOptions: joi.string().allow('').optional(),
            orderExtras: joi.string().allow('').optional(),
            paymentReference: joi.string().allow('').optional(),
            paymentAuthorizationCode: joi.string().allow('').optional(),
            paymentSignature: joi.string().allow('').optional(),
            paymentCustomerCode: joi.string().allow('').optional(),
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
            var deliveryPreference = req.body.deliveryPreference;
            var deliveryPhone = req.body.deliveryPhone;
            var deliveryCountryCode = req.body.deliveryCountryCode;
            var deliveryFullAddress = req.body.deliveryFullAddress;
            var deliveryLat = req.body.deliveryLat;
            var deliveryLong = req.body.deliveryLong;
            var paymentType = req.body.paymentType;
            var paymentReference = req.body.paymentReference;
            var paymentAuthorizationCode = req.body.paymentAuthorizationCode;
            var paymentSignature = req.body.paymentSignature;
            var paymentCustomerCode = req.body.paymentCustomerCode;
            var userType = req.body.userType;

            console.log('deliveryLat',deliveryLat);
            console.log('deliveryPreference',deliveryPreference);
            if ((userType == 'CUSTOMER') && (customerId == '')) {
                res.status(422).json({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Customer Id is required'
                });
            } else if (deliveryPreference == 'DELIVERY') {
                
                if ((deliveryPhone == '') || (deliveryPhone == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Delivery phone is required'
                    });
                } else if ((deliveryCountryCode == '')|| (deliveryCountryCode == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Delivery country code is required'
                    });
                } else if ((deliveryFullAddress == '') || (deliveryFullAddress == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Delivery full address is required'
                    });
                } else if ((deliveryLat == '') || (deliveryLat == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Delivery latitude is required'
                    });
                } else if ((deliveryLong == '') || (deliveryLong == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Delivery longitude is required'
                    });
                } else {
                    next();
                }

            } else if (paymentType == 'CARD') {
                if ((paymentReference == '') || (paymentReference == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Payment reference is required'
                    });
                } else if ((paymentAuthorizationCode == '') || (paymentAuthorizationCode == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Payment auth code is required'
                    });

                } else if ((paymentCustomerCode == '') || (paymentCustomerCode == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Payment customer code is required'
                    });

                } else {
                    next();
                }

            } else if (userType == 'GUEST') {
                var email = req.body.guestEmail;
                var phone = req.body.guestEmail;
                var countryCode = req.body.guestCountryCode;
                var name = req.body.guestName;
                if ((email == '') || (email == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Guest email is required'
                    });
                } else if ((phone == '') || (phone == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Guest phone is required'
                    });
                } else if ((countryCode == '') || (countryCode == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Guest country code is required'
                    });
                } else if ((name == '') || (name == undefined)) {
                    res.status(422).json({
                        success: false,
                        STATUSCODE: 422,
                        message: 'Guest name is required'
                    });
                } else {
                    next();
                }
            } else {
                next();
            }

        }
    },
    cartOrderValidation: async (req, res, next) => {

        var userType = ['CUSTOMER', 'GUEST']
        const appTypeVal = ["ANDROID", "IOS", "BROWSER"];
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            appType: joi.string().required().valid(...appTypeVal).error(new Error('App type required')),
            vendorId: joi.string().required().error(new Error('vendor Id is required')),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            price: joi.string().required().error(new Error('Please enter price')),
            discount: joi.string().allow('').optional(),
            finalPrice: joi.string().required().error(new Error('Please enter final price')),
            promocodeId: joi.string().allow('').optional(),
            promocode: joi.string().allow('').optional(),
            offerId: joi.string().allow('').optional(),
            items: joi.any().required().error(new Error('Item information required')),
            latitude: joi.string().required().error(new Error('Latitude required')),
            longitude: joi.string().required().error(new Error('Longitude required')),
            itemOptions: joi.string().allow('').optional(),
            orderExtras: joi.string().allow('').optional(),
            subTotal: joi.string().allow('').optional(),
            deliveryCharge: joi.string().allow('').optional(),
            allTotal: joi.string().allow('').optional()
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
                });
            } else {
                next();
            }

        }
    },
    submitReview: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            vendorId: joi.string().required().error(new Error('vendor Id is required')),
            customerName: joi.string().required().error(new Error('Customer name is required')),
            customerComment: joi.string().required().error(new Error('Customer comment is required')),
            customerRating: joi.number().required().error(new Error('Customer rating is required')),
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
    },
    orderSubmitReview: async (req, res, next) => {
        var userType = ['CUSTOMER']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            orderId: joi.string().required().error(new Error('vendor Id is required')),
            customerName: joi.string().required().error(new Error('Customer name is required')),
            customerComment: joi.string().allow('').optional(),
            customerRating: joi.number().required().error(new Error('Customer rating is required')),
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
    },
    getVendorDetails: async (req, res, next) => {
        var userType = ['CUSTOMER']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            vendorId: joi.string().required().error(new Error('vendor Id is required'))
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
    },
    customerOrderListValidator: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        var orderStatus = ['ONGOING', 'PAST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            orderStatus: joi.string().valid(...orderStatus).error(new Error('Please send orderStatus'))
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
    },
    customerOrderDetailsValidator: async (req, res, next) => {
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
    },
    promoCodeList: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            vendorId: joi.string().error(new Error('Please send restaurant id'))
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
    },
    applyPromoCode: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            vendorId: joi.string().error(new Error('Please send restaurant id')),
            promoCode: joi.string().required().error(new Error('Promo code required')),
            subTotal: joi.string().required().error(new Error('Sub total required')),
            deliveryCharge: joi.string().required().error(new Error('Delivery charge required')),
            allTotal: joi.string().required().error(new Error('All total required'))
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
    },
    customerSearchValidator: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            latitude: joi.string().required().error(new Error('Latitude required')),
            longitude: joi.string().required().error(new Error('Longitude required')),
            search: joi.string().required().error(new Error('Please enter search value')),
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
    },
    favouriteChange: async (req, res, next) => {
        var userType = ['CUSTOMER']
        var favVal = ['YES', 'NO']
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is required')),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            vendorId: joi.string().required().error(new Error('Vendor id is required')),
            favourite: joi.string().required().valid(...favVal).error(new Error('Favourite value is required')),
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
    favouriteList: async (req, res, next) => {
        var userType = ['CUSTOMER']
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is required')),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            latitude: joi.string().required().error(new Error('Latitude required')),
            longitude: joi.string().required().error(new Error('Longitude required')),
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
    bannerVendorList: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            latitude: joi.string().required().error(new Error('Latitude required')),
            longitude: joi.string().required().error(new Error('Longitude required')),
            bannerId: joi.string().required().error(new Error('Please enter Banner id')),
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
    },
    protectGuestUser: async (req, res, next) => {
        var userType = ['GUEST'];
        var appType = ['Android'];
        const rules = joi.object({
            appType: joi.string().valid(...appType).error(new Error('Only android is allowed')),
            userType: joi.string().valid(...userType).error(new Error('Only guest is allowed')),
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
    },
    physicalAddressByLatlong: async (req, res, next) => {
        var userType = ['CUSTOMER', 'GUEST']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Guest user is not allowed')),
            latitude: joi.string().required().error(new Error('Latitude required')),
            longitude: joi.string().required().error(new Error('Longitude required'))
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
    },
    addAddress: async (req, res, next) => {
        var userType = ['CUSTOMER']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            fullAddress: joi.string().allow('').optional(),
            houseNo: joi.string().allow('').optional(),
            landMark: joi.string().allow('').optional(),
            phone: joi.string().allow('').optional(),
            countryCode: joi.string().allow('').optional(),
            addressType: joi.string().allow('').optional(),
            latitude: joi.string().required().error(new Error('Latitude required')),
            longitude: joi.string().required().error(new Error('Longitude required'))
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
    },
    editAddress: async (req, res, next) => {
        var userType = ['CUSTOMER']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            addressId: joi.string().required().error(new Error('Address id required')),
            fullAddress: joi.string().allow('').optional(),
            houseNo: joi.string().allow('').optional(),
            landMark: joi.string().allow('').optional(),
            phone: joi.string().allow('').optional(),
            countryCode: joi.string().allow('').optional(),
            addressType: joi.string().allow('').optional(),
            latitude: joi.string().required().error(new Error('Latitude required')),
            longitude: joi.string().required().error(new Error('Longitude required'))
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
    },
    listAddress: async (req, res, next) => {
        var userType = ['CUSTOMER']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType'))
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
    },
    deleteAddress: async (req, res, next) => {
        var userType = ['CUSTOMER']
        const rules = joi.object({
            customerId: joi.string().allow('').optional(),
            userType: joi.string().valid(...userType).error(new Error('Please send userType')),
            addressId: joi.string().required().error(new Error('Address id required')),
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
    },
    getNotificationData: async (req, res, next) => {
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is required'))
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
    updateNotificationData: async (req, res, next) => {
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is required')),
            notificationData: joi.any().allow('')
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
    notificationList: async (req, res, next) => {
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is required'))
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
    notificationDelete: async (req, res, next) => {
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is required')),
            notificationId: joi.string().required().error(new Error('Notification id is required'))
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
    getCustomerContent: async (req, res, next) => {
        const rules = joi.object({
            customerId: joi.string().required().error(new Error('Customer id is required')),
            pageName: joi.string().required().error(new Error('Page name is required')),
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