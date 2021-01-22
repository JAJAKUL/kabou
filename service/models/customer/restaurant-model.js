var vendorSchema = require('../../schema/Vendor');
var vendorFavouriteSchema = require('../../schema/VendorFavourite');
var vendorCategorySchema = require('../../schema/VendorCategory');
var mappingVendorCategorySchema = require('../../schema/MappingVendorCategory');
var categorySchema = require('../../schema/Category');
var paymentSchema = require('../../schema/Payment');
var vendorPaymentSettingSchema = require('../../schema/VendorPaymentSetting');
var offerBannerSchema = require('../../schema/OfferBanner');
var itemSchema = require('../../schema/Item');
var userDeviceLoginSchemaSchema = require('../../schema/UserDeviceLogin');
var customerSchema = require('../../schema/Customer');
var vendorOwnerSchema = require('../../schema/VendorOwner');
var vendorReviewSchema = require('../../schema/VendorReview');
var paymentReferenceSchema = require('../../schema/PaymentReference');
var autoNotificationSchema = require('../../schema/AutoNotification');
var customerFaqSchema = require('../../schema/Faq');
var customerlogSchema = require('../../schema/CustomerLog');

var orderSchema = require('../../schema/Order');
var OrderDetailSchema = require('../../schema/OrderDetail');
var config = require('../../config');
var PushLib = require('../../libraries/pushlib/send-push');
var UserNotificationSchema = require('../../schema/UserNotification');
var customerAddressSchema = require('../../schema/CustomerAddress');
var ItemExtraSchema = require('../../schema/ItemExtra');
var userNotificationSettingSchema = require('../../schema/UserNotificationSetting');
var adminSettingSchema = require('../../schema/AdminSetting');
var promoCodeSchema = require('../../schema/PromoCode');
var jwt = require('jsonwebtoken');

module.exports = {
    //Customer Home/Dashboard API
    customerHome: async (data, callBack) => {
        if (data) {
            var latt = data.body.latitude;
            var long = data.body.longitude;
            var userType = data.body.userType;
            var categoryId = data.body.categoryId;
            var responseDt = [];
            var response_data = {};

            // console.log(data.body);

            // await UserNotificationSchema.updateMany({ _id: {$ne : '5f48c576d7871753c57b4276'} }, {
            //     $set: {
            //         isRead: 'YES'
            //     }
            // });

            var adminSetting = await adminSettingSchema.findOne({ type: 1 });

            var vendorQry = {
                location: {
                    $near: {
                        $maxDistance: adminSetting.availabilityRadiusHome,
                        $geometry: {
                            type: "Point",
                            coordinates: [long, latt]
                        }
                    }
                },
                isActive: true,
                isDisabled: { $ne: true }
            }

            console.log('vendorQry',vendorQry);
            var vendorIdArr = [];
            var catCheck = 0;
            if (categoryId != '1') {
                catCheck = 1;
                var mapvendorCatArr = await mappingVendorCategorySchema.find({ vendorCategoryId: categoryId });
                if (mapvendorCatArr.length > 0) {
                    for (let mapvendorVal of mapvendorCatArr) {
                        var vendorId = mapvendorVal.vendorId.toString();
                        vendorIdArr.push(vendorId);
                    }
                }
            }

            if (catCheck == 1) {
                vendorQry._id = { $in: vendorIdArr }
            }

            //SORT
            var sortText = data.body.sort;
            var sortObj = {};
            if (sortText == 'POPULARITY') {
                sortObj.popularity = 'desc'
            } else if (sortText == 'RATING') {
                sortObj.rating = 'desc'
            }


         console.log('vendorQry', vendorQry);

            vendorSchema.find(vendorQry)
                .sort(sortObj)
                .populate('vendorOpenCloseTime')
                .exec(async function (err, results) {
                    if (err) {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    } else {
                       // console.log('results',results);
                        var totalRes = results.length;
                        if (results.length > 0) {
                            var vendorIds = [];
                            var allCatIdArr = [];
                            for (let restaurant of results) {
                                var responseObj = {};
                                responseObj = {
                                    id: restaurant._id,
                                    name: restaurant.restaurantName,
                                    description: restaurant.description,
                                    logo: `${config.serverhost}:${config.port}/img/vendor/${restaurant.logo}`,
                                    rating: parseFloat((restaurant.rating).toFixed(1)),
                                    delivery: restaurant.delivery,
                                    address: restaurant.address
                                };

                                if (restaurant.logo == '') {
                                    responseObj.logo = '';
                                } else {
                                    `${config.serverhost}:${config.port}/img/vendor/${restaurant.logo}`;
                                }

                                //CLOSE & CATEGORY
                                responseObj.restaurantClose = restaurant.restaurantClose;
                                var mapvendorCatArr = await mappingVendorCategorySchema.find({ vendorId: restaurant._id });
                               // console.log('mapvendorCatArr', mapvendorCatArr);
                                var catIdArr = [];
                                if (mapvendorCatArr.length > 0) {

                                    for (let mapvendorVal of mapvendorCatArr) {
                                        var categoryId = mapvendorVal.vendorCategoryId.toString();
                                        catIdArr.push(categoryId);
                                        allCatIdArr.push(categoryId);
                                    }
                                }
                                responseObj.category = await vendorCategorySchema.find({ _id: { $in: catIdArr }, isActive: true }).sort({ sortOrder: 'asc' });
                                //CLOSE & CATEGORY

                                // console.log(restaurant.location.coordinates);

                                //Calculate Distance
                                var sourceLat = restaurant.location.coordinates[1];
                                var sourceLong = restaurant.location.coordinates[0];

                                var destLat = latt;
                                var destLong = long;
                                responseObj.distance = await getDistanceinMtr(sourceLat, sourceLong, destLat, destLong);
                                // console.log(responseObj);

                                responseObj.latitude = sourceLat;
                                responseObj.longitude = sourceLong;
                                //Get Favorites (Only for Genuine Customers, No Guest)
                                if (userType == 'GUEST') {
                                    responseObj.favorite = 0;
                                } else {
                                    var customerId = data.body.customerId;
                                    var vendorId = restaurant._id;
                                    responseObj.favorite = await vendorFavouriteSchema.countDocuments({ vendorId: vendorId, customerId: customerId });
                                }

                                //Offer 
                                var itemsChecks = await itemSchema.find({ vendorId: restaurant._id, isActive: true, isApprove: true });
                                if (itemsChecks.length > 0) {
                                    var finalPriceArr = [];
                                    var finalPriceValueArr = [];
                                    var minPrice = -5;
                                    var offerWord = '';
                                    for (itemsCheck of itemsChecks) {
                                        var itemPrice = itemsCheck.price;
                                        var discountAmount = itemsCheck.discountAmount;
                                        if (itemsCheck.discountType == 'PERCENTAGE') {
                                            var finalPrce = (Number(itemPrice) - ((Number(itemPrice) * Number(discountAmount)) / 100));
                                        } else if (itemsCheck.discountType == 'FLAT') {
                                            var finalPrce = (Number(itemPrice) - Number(discountAmount));
                                        } else {
                                            var finalPrce = Number(itemPrice);
                                        }

                                        if (minPrice == -5) {

                                            minPrice = finalPrce;

                                            if (itemsCheck.discountType == 'PERCENTAGE') {
                                                offerWord = `Upto ${discountAmount}% off`;
                                            } else if (itemsCheck.discountType == 'FLAT') {
                                                offerWord = `Upto flat ₦${discountAmount} off`;
                                            } else {
                                                offerWord = '';
                                            }
                                        } else {
                                            if (finalPrce < minPrice) {
                                                minPrice = finalPrce;

                                                if (itemsCheck.discountType == 'PERCENTAGE') {
                                                    offerWord = `Upto ${discountAmount}% off`;
                                                } else if (itemsCheck.discountType == 'FLAT') {
                                                    offerWord = `Upto flat ₦${discountAmount} off`;
                                                } else {
                                                    offerWord = '';
                                                }
                                            }
                                        }
                                        finalPriceArr.push(finalPrce);
                                        finalPriceValueArr.push(discountAmount);

                                    }


                                    responseObj.offer = offerWord;

                                } else {
                                    totalRes--;
                                    continue;
                                    responseObj.offer = ''
                                }


                                //Open time
                                var vendorTimeArr = [];
                                var openTimeArr = [];
                                var closeTimeArr = [];
                                if (restaurant.vendorOpenCloseTime.length > 0) {
                                    if (restaurant.vendorOpenCloseTime.length == 7) {
                                        var everydayCheck = 1;
                                    } else {
                                        var everydayCheck = 0;
                                    }


                                    for (let vendorTime of restaurant.vendorOpenCloseTime) {
                                        var vendorTimeObj = {};
                                        //  console.log(vendorTime);
                                        if (everydayCheck == 1) {

                                            openTimeArr.push(vendorTime.openTime);
                                            closeTimeArr.push(vendorTime.closeTime);
                                        }
                                        //OPEN TIME CALCULATION
                                        var openTimeAMPM = '';
                                        var openTimeHours = '';
                                        var openTimeMin = '';
                                        if (vendorTime.openTime < 720) {
                                            var num = vendorTime.openTime;
                                            openTimeAMPM = 'am';
                                        } else {
                                            var num = (vendorTime.openTime - 720);
                                            openTimeAMPM = 'pm';
                                        }

                                        var openHours = (num / 60);
                                        var openrhours = Math.floor(openHours);
                                        var openminutes = (openHours - openrhours) * 60;
                                        var openrminutes = Math.round(openminutes);

                                        openTimeHours = openrhours;
                                        openTimeMin = openrminutes;

                                        if (openTimeMin < 10) {
                                            openTimeMin = `${openTimeMin}0`
                                        }

                                        //CLOSE TIME CALCULATION
                                        var closeTimeAMPM = '';
                                        var closeTimeHours = '';
                                        var closeTimeMin = '';
                                        if (vendorTime.closeTime < 720) {
                                            var num = vendorTime.closeTime;
                                            closeTimeAMPM = 'am';
                                        } else {
                                            var num = (vendorTime.closeTime - 720);
                                            closeTimeAMPM = 'pm';
                                        }

                                        var closeHours = (num / 60);
                                        var closerhours = Math.floor(closeHours);
                                        var closeminutes = (closeHours - closerhours) * 60;
                                        var closerminutes = Math.round(closeminutes);

                                        closeTimeHours = closerhours;
                                        closeTimeMin = closerminutes;

                                        if (closeTimeMin < 10) {
                                            closeTimeMin = `${closeTimeMin}0`
                                        }

                                        vendorTimeObj.day = vendorTime.day;
                                        vendorTimeObj.openTime = `${openTimeHours}:${openTimeMin} ${openTimeAMPM}`
                                        vendorTimeObj.closeTime = `${closeTimeHours}:${closeTimeMin} ${closeTimeAMPM}`

                                        vendorTimeArr.push(vendorTimeObj);
                                    }
                                }

                                // responseDt.restaurant = restaurantInfo;

                                //Everyday Check
                                // if (everydayCheck == 1) {
                                //     // console.log(openTimeArr);
                                //     // console.log(closeTimeArr);
                                //     var uniqueOpen = openTimeArr.filter(onlyUnique);
                                //     var uniqueClose = closeTimeArr.filter(onlyUnique);
                                //     if ((uniqueOpen.length == 1) && (uniqueClose.length == 1)) {
                                //         responseDt.vendorTimeEveryday = 1;
                                //         responseDt.vendorTimeEverydayStart = uniqueOpen[0];
                                //         responseDt.vendorTimeEverydayClose = uniqueClose[0];
                                //     }
                                // } else {
                                //     responseDt.vendorTimeEveryday = 0;
                                // }

                                responseObj.vendorTime = vendorTimeArr;





                                responseDt.push(responseObj);
                                var vendrId = (restaurant._id).toString();
                                vendorIds.push(vendrId);
                            }

                            //Restaurant
                            response_data.vendor = responseDt;

                            //  console.log('catIdArr', allCatIdArr);
                            //Category Data

                            var defaultCategory = [
                                // {
                                //     _id: '1',
                                //     categoryName: 'All',
                                //     image: '1.png'
                                // }
                            ]

                            var resCategoryData = await vendorCategorySchema.find({ isActive: true, _id: { $in: allCatIdArr } }, { "categoryName": 1, "image": 1 }).sort({ sortOrder: 'asc' });

                            var mergedArr = defaultCategory.concat(resCategoryData);
                            response_data.category_data = mergedArr;
                            response_data.category_imageUrl = `${config.serverhost}:${config.port}/img/vendor_category/`;

                            //Banner Data
                            // console.log(vendorIds);

                            var bannerData = await offerBannerSchema.find(
                                { $and: [{ fromDate: { $lte: new Date() } }, { toDate: { $gte: new Date() } }, { $or: [{ vendorId: { $in: vendorIds } }, { vendorId: '' }] }, { isActive: { $ne: false } }] })
                                .sort({ sortOrder: 1, createdAt: -1 });

                            var bannerArrr = [];

                            var vendorIdArr = [];
                            var catCheck = 0;

                            if (bannerData.length > 0) {
                                for (let bannerDt of bannerData) {
                                    var bannerObj = {
                                        bannerType: bannerDt.bannerType,
                                        image: bannerDt.image,
                                        offerText: bannerDt.offerText,
                                        _id: bannerDt._id,
                                        vendorId: bannerDt.vendorId
                                    };
                                    if (bannerDt.bannerType == 'promocode') {

                                        //Get Promo Code Details
                                        var promoCodeId = bannerDt.promoCodeId;

                                        var promocodeObj = await promoCodeSchema.findOne({ _id: promoCodeId });

                                        //  console.log(promocodeObj);

                                        if (promocodeObj != null) {
                                            promoCodeDetails = promocodeObj;

                                            if (promocodeObj.vendorType == 'SPECIFIC') {
                                                catCheck = 1;
                                                vendorIdArr = promocodeObj.vendorId;

                                                //VENDOR BANNER CHECK START 
                                                if(vendorIdArr.length > 0) {
                                                    var totalvendorLeng = vendorIdArr.length;
                                                    var currentVendr = 0;
                                                    for(let vndrId of vendorIdArr) {
                                                        if(vendorIds.includes(vndrId.toString())) {
                                                            break;
                                                        } else {
                                                            currentVendr ++;
                                                        }
                                                    }

                                                    if(totalvendorLeng == currentVendr) {
                                                        continue;
                                                    }
                                                }
                                                //VENDOR BANNER CHECK END
                                            }

                                        }

                                        bannerObj.vendor = 'promocode'
                                        bannerObj.type = 0;
                                        bannerObj.vendorId = '';
                                        bannerObj.delivery = true
                                    } else if (bannerDt.bannerType == '') {
                                        bannerObj.vendor = 'All Restaurant'

                                        bannerObj.type = 0;
                                        bannerObj.vendorId = '';
                                        bannerObj.delivery = true
                                    } else if (bannerDt.bannerType == '1') {
                                        var resBans = await vendorSchema.find({ _id: { $in: bannerDt.vendorId }, isDisabled: { $ne: true } });
                                        
                                        catCheck = 1;
                                        vendorIdArr = bannerDt.vendorId;
                                        if (resBans.length > 0) {
                                            var resArr = [];
                                            for (let resBan of resBans) {
                                                resArr.push(resBan.restaurantName);
                                            }
                                            bannerObj.vendor = 'Selected Restaurant';
                                        }
                                        bannerObj.type = 0;
                                        bannerObj.vendorId = '';
                                        bannerObj.delivery = true
                                    } else {
                                        bannerObj.type = 1;
                                        var resBan = await vendorSchema.findOne({ _id: { $in: bannerDt.vendorId } });
                                        vendorIdArr = bannerDt.vendorId;
                                        catCheck = 1;
                                        var checkOffer = await itemSchema.findOne({ vendorId: resBan._id, discountType: { $ne: 'NONE' }, isActive: true, isApprove: true });

                                        if (checkOffer != null) {
                                            bannerObj.vendor = resBan.restaurantName;
                                        } else {
                                            // await offerBannerSchema.updateOne({ _id: resBan._id }, {
                                            //     $set: { isActive: false }
                                            // });

                                            continue;

                                        }

                                        bannerObj.delivery = resBan.delivery
                                    }

                                    bannerArrr.push(bannerObj);
                                }
                            }

                            response_data.banner_data = bannerArrr;
                            response_data.banner_imageUrl = `${config.serverhost}:${config.port}/img/offer/`;

                            if (userType == 'CUSTOMER') {
                                var customerId = data.body.customerId
                                var customerData = await customerSchema.findOne({ _id: customerId });

                                response_data.badgeCount = Number(customerData.badgeCount);
                            } else {
                                response_data.badgeCount = 0;
                            }



                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: `${totalRes} nearby restaurants found.`,
                                response_data: response_data
                            })

                        } else {
                            if (userType == 'CUSTOMER') {
                                var customerId = data.body.customerId
                                var customerData = await customerSchema.findOne({ _id: customerId });

                                response_data.badgeCount = Number(customerData.badgeCount);
                            } else {
                                response_data.badgeCount = 0;
                            }
                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: 'No nearby restaurants found.',
                                response_data: response_data
                            })
                        }
                    }
                });
        }
    },
    //Customer Restaurant details API
    restaurantDetails: async (data, callBack) => {
        if (data) {

            var vendorId = data.vendorId;
            var categoryId = data.categoryId;
            var responseDt = {};
            var latt = data.latitude;
            var long = data.longitude;
            var restaurantInformation = data.restaurantInfo;
            // return;

            var adminSetting = await adminSettingSchema.findOne({ type: 1 });

            if (restaurantInformation == 'YES') {

                var vendorDetailsObj = {
                    location: {
                        $near: {
                            $maxDistance: adminSetting.availabilityRadiusHome,
                            $geometry: {
                                type: "Point",
                                coordinates: [long, latt]
                            }
                        }
                    },
                    _id: vendorId,
                    isActive: true,
                    isDisabled: { $ne: true }
                }

                vendorSchema.findOne(vendorDetailsObj)
                    .populate('vendorOpenCloseTime')
                    .exec(async function (err, results) {
                        if (err) {
                            console.log(err);
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Internal error',
                                response_data: {}
                            });
                        } else {

                            if (results != null) {
                                var restaurantInfo = {
                                    name: results.restaurantName,
                                    description: results.description,
                                    rating: parseFloat((results.rating).toFixed(1)),
                                    logo: `${config.serverhost}:${config.port}/img/vendor/${results.logo}`,
                                    banner: `${config.serverhost}:${config.port}/img/vendor/${results.banner}`,
                                    restaurantClose: results.restaurantClose,
                                    address: results.address
                                };

                                //Calculate Distance
                                var sourceLat = results.location.coordinates[1];
                                var sourceLong = results.location.coordinates[0];

                                restaurantInfo.latitude = sourceLat;
                                restaurantInfo.longitude = sourceLong;

                                var destLat = latt;
                                var destLong = long;
                                restaurantInfo.distance = await getDistanceinMtr(sourceLat, sourceLong, destLat, destLong);

                                //Open time
                                var vendorTimeArr = [];
                                var openTimeArr = [];
                                var closeTimeArr = [];
                                if (results.vendorOpenCloseTime.length > 0) {
                                    if (results.vendorOpenCloseTime.length == 7) {
                                        var everydayCheck = 1;
                                    } else {
                                        var everydayCheck = 0;
                                    }


                                    for (let vendorTime of results.vendorOpenCloseTime) {
                                        var vendorTimeObj = {};
                                        //  console.log(vendorTime);
                                        if (everydayCheck == 1) {

                                            openTimeArr.push(vendorTime.openTime);
                                            closeTimeArr.push(vendorTime.closeTime);
                                        }
                                        //OPEN TIME CALCULATION
                                        var openTimeAMPM = '';
                                        var openTimeHours = '';
                                        var openTimeMin = '';
                                        if (vendorTime.openTime < 720) {
                                            var num = vendorTime.openTime;
                                            openTimeAMPM = 'am';
                                        } else {
                                            var num = (vendorTime.openTime - 720);
                                            openTimeAMPM = 'pm';
                                        }

                                        var openHours = (num / 60);
                                        var openrhours = Math.floor(openHours);
                                        var openminutes = (openHours - openrhours) * 60;
                                        var openrminutes = Math.round(openminutes);

                                        openTimeHours = openrhours;
                                        openTimeMin = openrminutes;

                                        if (openTimeMin < 10) {
                                            openTimeMin = `${openTimeMin}0`
                                        }

                                        //CLOSE TIME CALCULATION
                                        var closeTimeAMPM = '';
                                        var closeTimeHours = '';
                                        var closeTimeMin = '';
                                        if (vendorTime.closeTime < 720) {
                                            var num = vendorTime.closeTime;
                                            closeTimeAMPM = 'am';
                                        } else {
                                            var num = (vendorTime.closeTime - 720);
                                            closeTimeAMPM = 'pm';
                                        }

                                        var closeHours = (num / 60);
                                        var closerhours = Math.floor(closeHours);
                                        var closeminutes = (closeHours - closerhours) * 60;
                                        var closerminutes = Math.round(closeminutes);

                                        closeTimeHours = closerhours;
                                        closeTimeMin = closerminutes;

                                        if (closeTimeMin < 10) {
                                            closeTimeMin = `${closeTimeMin}0`
                                        }

                                        vendorTimeObj.day = vendorTime.day;
                                        vendorTimeObj.openTime = `${openTimeHours}:${openTimeMin} ${openTimeAMPM}`
                                        vendorTimeObj.closeTime = `${closeTimeHours}:${closeTimeMin} ${closeTimeAMPM}`

                                        vendorTimeArr.push(vendorTimeObj);
                                    }
                                }

                                responseDt.restaurant = restaurantInfo;

                                //Everyday Check
                                if (everydayCheck == 1) {
                                    // console.log(openTimeArr);
                                    // console.log(closeTimeArr);
                                    var uniqueOpen = openTimeArr.filter(onlyUnique);
                                    var uniqueClose = closeTimeArr.filter(onlyUnique);
                                    if ((uniqueOpen.length == 1) && (uniqueClose.length == 1)) {
                                        responseDt.vendorTimeEveryday = 1;
                                        responseDt.vendorTimeEverydayStart = uniqueOpen[0];
                                        responseDt.vendorTimeEverydayClose = uniqueClose[0];
                                    }
                                } else {
                                    responseDt.vendorTimeEveryday = 0;
                                }

                                responseDt.vendorTime = vendorTimeArr;


                                //Get Item Details
                                var restaurantItemDetails = await restaurantCategoryItem(data, vendorId, categoryId);

                                if (restaurantItemDetails != 'err') {
                                    responseDt.catitem = restaurantItemDetails;

                                  //  console.log('responseDt',responseDt);

                                    callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: 'Restaurant details.',
                                        response_data: responseDt
                                    });

                                    //  console.log(responseDt);
                                } else {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error.',
                                        response_data: {}
                                    });
                                }

                            } else {
                                callBack({
                                    success: false,
                                    STATUSCODE: 400,
                                    message: 'This restaurant is not available in your current location, Please change the delivery address.',
                                    response_data: {}
                                });
                            }
                        }
                        //console.log(results);
                    });

            } else {

                //Get Item Details
                restaurantCategoryItem(data, vendorId, categoryId)
                    .then(function (restaurantItemDetails) {

                        if (restaurantItemDetails != 'err') {
                            responseDt.catitem = restaurantItemDetails;

                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: 'Restaurant details.',
                                response_data: responseDt
                            });

                            //  console.log(responseDt);
                        } else {
                            callBack({
                                success: false,
                                STATUSCODE: 500,
                                message: 'Internal DB error.',
                                response_data: {}
                            });
                        }
                    }).catch(function (err) {
                        console.log(err);
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error.',
                            response_data: {}
                        });
                    });
            }


        }
    },
    //Customer VendorCategories
    vendorCategories: async (data, callBack) => {
        if (data) {

            var response_data = {};

            var resCategoryData = await vendorCategorySchema.find({ isActive: true }, { "categoryName": 1, "image": 1 }).sort({ sortOrder: 'asc' });

            response_data.category_data = resCategoryData;
            response_data.category_imageUrl = `${config.serverhost}:${config.port}/img/vendor_category/`;

            callBack({
                success: true,
                STATUSCODE: 200,
                message: `All restaurant categories.`,
                response_data: response_data
            })


        }
    },
    //Banner Vedor List
    bannerVendorList: async (data, callBack) => {
        if (data) {
            var latt = data.body.latitude;
            var long = data.body.longitude;
            var userType = data.body.userType;
            var bannerId = data.body.bannerId;
            var responseDt = [];
            var response_data = {};
            var filterBanner = 0;

            console.log('Request', data.body);

            var adminSetting = await adminSettingSchema.findOne({ type: 1 });

            var vendorQry = {
                location: {
                    $near: {
                        $maxDistance: adminSetting.availabilityRadiusHome,
                        $geometry: {
                            type: "Point",
                            coordinates: [long, latt]
                        }
                    }
                },
                isActive: true,
                isDisabled: { $ne: true }
            }

            var vendorIdArr = [];
            var catCheck = 0;
            var promoCodeDetails = {};

            var bannerDt = await offerBannerSchema.findOne({ _id: bannerId });



            if (bannerDt.bannerType == 'promocode') { //PROMO BANNER

                //Get Promo Code Details
                var promoCodeId = bannerDt.promoCodeId;

                var promocodeObj = await promoCodeSchema.findOne({ _id: promoCodeId });

                //  console.log(promocodeObj);

                if (promocodeObj != null) {
                    promoCodeDetails = promocodeObj;

                    if (promocodeObj.vendorType == 'SPECIFIC') {
                        catCheck = 1;
                        vendorIdArr = promocodeObj.vendorId
                    }

                }
            } else if (bannerDt.bannerType == '') { //ALL RESTAURANT
                filterBanner = 1;
            } else if (bannerDt.bannerType == '1') { //SELECTED RESTAURANT
                filterBanner = 1;
                catCheck = 1;
                var resBans = await vendorSchema.find({ _id: { $in: bannerDt.vendorId }, isDisabled: { $ne: true } });

                if (resBans.length > 0) {
                    for (let resBan of resBans) {
                        var resId = (resBan._id).toString();
                        vendorIdArr.push(resId);
                    }
                }

            } else {
                filterBanner = 1;
                catCheck = 1;
                var resBan = await vendorSchema.findOne({ _id: { $in: bannerDt.vendorId } });

                vendorIdArr.push(resBan._id);
            }


            if (catCheck == 1) {
                vendorQry._id = { $in: vendorIdArr }
            }

            //SORT

            var sortObj = {};

            console.log('vendorIdArr', vendorIdArr);
            // return;

            vendorSchema.find(vendorQry)
                .sort(sortObj)
                // .limit(4)
                .populate('vendorOpenCloseTime')
                .exec(async function (err, results) {
                    if (err) {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    } else {
                        // console.log(results.length);
                        //  return;
                        var totalRes = results.length;
                        var totalCutOffer = 0;
                        if (results.length > 0) {
                            var vendorIds = [];
                            var allCatIdArr = [];
                            for (let restaurant of results) {

                                if (filterBanner == 1) {
                                    var checkOffer = await itemSchema.findOne({ vendorId: restaurant._id, discountType: { $ne: 'NONE' } });

                                    if (checkOffer == null) {
                                        totalCutOffer++;
                                        continue;
                                    }
                                }

                                var responseObj = {};
                                responseObj = {
                                    id: restaurant._id,
                                    name: restaurant.restaurantName,
                                    description: restaurant.description,
                                    logo: `${config.serverhost}:${config.port}/img/vendor/${restaurant.logo}`,
                                    rating: parseFloat((restaurant.rating).toFixed(1)),
                                    delivery: restaurant.delivery

                                };

                                //CLOSE & CATEGORY
                                responseObj.restaurantClose = restaurant.restaurantClose;
                                var mapvendorCatArr = await mappingVendorCategorySchema.find({ vendorId: restaurant._id });

                                var catIdArr = [];
                                if (mapvendorCatArr.length > 0) {
                                    for (let mapvendorVal of mapvendorCatArr) {
                                        var categoryId = mapvendorVal.vendorCategoryId.toString();
                                        catIdArr.push(categoryId);
                                        allCatIdArr.push(categoryId);
                                    }
                                }
                                responseObj.category = await vendorCategorySchema.find({ _id: { $in: catIdArr }, isActive: true }).sort({ sortOrder: 'asc' });
                                //CLOSE & CATEGORY

                                // console.log(restaurant.location.coordinates);

                                //Get Favorites (Only for Genuine Customers, No Guest)
                                if (userType == 'GUEST') {
                                    responseObj.favorite = 0;
                                } else {
                                    var customerId = data.body.customerId;
                                    var vendorId = restaurant._id;
                                    responseObj.favorite = await vendorFavouriteSchema.countDocuments({ vendorId: vendorId, customerId: customerId });
                                }

                                //Calculate Distance
                                var sourceLat = restaurant.location.coordinates[1];
                                var sourceLong = restaurant.location.coordinates[0];

                                var destLat = latt;
                                var destLong = long;
                                responseObj.distance = await getDistanceinMtr(sourceLat, sourceLong, destLat, destLong);
                                // console.log(responseObj);

                                responseObj.latitude = sourceLat;
                                responseObj.longitude = sourceLong;

                                //Offer 
                                var itemsChecks = await itemSchema.find({ vendorId: restaurant._id, isActive: true, isApprove: true });
                                if (itemsChecks.length > 0) {
                                    var finalPriceArr = [];
                                    var finalPriceValueArr = [];
                                    var minPrice = -5;
                                    var offerWord = '';
                                    for (itemsCheck of itemsChecks) {
                                        var itemPrice = itemsCheck.price;
                                        var discountAmount = itemsCheck.discountAmount;
                                        if (itemsCheck.discountType == 'PERCENTAGE') {
                                            var finalPrce = (Number(itemPrice) - ((Number(itemPrice) * Number(discountAmount)) / 100));
                                        } else if (itemsCheck.discountType == 'FLAT') {
                                            var finalPrce = (Number(itemPrice) - Number(discountAmount));
                                        } else {
                                            var finalPrce = Number(itemPrice);
                                        }

                                        if (minPrice == -5) {

                                            minPrice = finalPrce;

                                            if (itemsCheck.discountType == 'PERCENTAGE') {
                                                offerWord = `Upto ${discountAmount}% off`;
                                            } else if (itemsCheck.discountType == 'FLAT') {
                                                offerWord = `Upto flat ₦${discountAmount} off`;
                                            } else {
                                                offerWord = '';
                                            }
                                        } else {
                                            if (finalPrce < minPrice) {
                                                minPrice = finalPrce;

                                                if (itemsCheck.discountType == 'PERCENTAGE') {
                                                    offerWord = `Upto ${discountAmount}% off`;
                                                } else if (itemsCheck.discountType == 'FLAT') {
                                                    offerWord = `Upto flat ₦${discountAmount} off`;
                                                } else {
                                                    offerWord = '';
                                                }
                                            }
                                        }
                                        finalPriceArr.push(finalPrce);
                                        finalPriceValueArr.push(discountAmount);

                                    }


                                    responseObj.offer = offerWord;

                                } else {
                                    continue;
                                    responseObj.offer = ''
                                }


                                //Open time
                                var vendorTimeArr = [];
                                var openTimeArr = [];
                                var closeTimeArr = [];
                                if (restaurant.vendorOpenCloseTime.length > 0) {
                                    if (restaurant.vendorOpenCloseTime.length == 7) {
                                        var everydayCheck = 1;
                                    } else {
                                        var everydayCheck = 0;
                                    }


                                    for (let vendorTime of restaurant.vendorOpenCloseTime) {
                                        var vendorTimeObj = {};
                                        //  console.log(vendorTime);
                                        if (everydayCheck == 1) {

                                            openTimeArr.push(vendorTime.openTime);
                                            closeTimeArr.push(vendorTime.closeTime);
                                        }
                                        //OPEN TIME CALCULATION
                                        var openTimeAMPM = '';
                                        var openTimeHours = '';
                                        var openTimeMin = '';
                                        if (vendorTime.openTime < 720) {
                                            var num = vendorTime.openTime;
                                            openTimeAMPM = 'am';
                                        } else {
                                            var num = (vendorTime.openTime - 720);
                                            openTimeAMPM = 'pm';
                                        }

                                        var openHours = (num / 60);
                                        var openrhours = Math.floor(openHours);
                                        var openminutes = (openHours - openrhours) * 60;
                                        var openrminutes = Math.round(openminutes);

                                        openTimeHours = openrhours;
                                        openTimeMin = openrminutes;

                                        if (openTimeMin < 10) {
                                            openTimeMin = `${openTimeMin}0`
                                        }

                                        //CLOSE TIME CALCULATION
                                        var closeTimeAMPM = '';
                                        var closeTimeHours = '';
                                        var closeTimeMin = '';
                                        if (vendorTime.closeTime < 720) {
                                            var num = vendorTime.closeTime;
                                            closeTimeAMPM = 'am';
                                        } else {
                                            var num = (vendorTime.closeTime - 720);
                                            closeTimeAMPM = 'pm';
                                        }

                                        var closeHours = (num / 60);
                                        var closerhours = Math.floor(closeHours);
                                        var closeminutes = (closeHours - closerhours) * 60;
                                        var closerminutes = Math.round(closeminutes);

                                        closeTimeHours = closerhours;
                                        closeTimeMin = closerminutes;

                                        if (closeTimeMin < 10) {
                                            closeTimeMin = `${closeTimeMin}0`
                                        }

                                        vendorTimeObj.day = vendorTime.day;
                                        vendorTimeObj.openTime = `${openTimeHours}:${openTimeMin} ${openTimeAMPM}`
                                        vendorTimeObj.closeTime = `${closeTimeHours}:${closeTimeMin} ${closeTimeAMPM}`

                                        vendorTimeArr.push(vendorTimeObj);
                                    }
                                }

                                // responseDt.restaurant = restaurantInfo;

                                //Everyday Check
                                // if (everydayCheck == 1) {
                                //     // console.log(openTimeArr);
                                //     // console.log(closeTimeArr);
                                //     var uniqueOpen = openTimeArr.filter(onlyUnique);
                                //     var uniqueClose = closeTimeArr.filter(onlyUnique);
                                //     if ((uniqueOpen.length == 1) && (uniqueClose.length == 1)) {
                                //         responseDt.vendorTimeEveryday = 1;
                                //         responseDt.vendorTimeEverydayStart = uniqueOpen[0];
                                //         responseDt.vendorTimeEverydayClose = uniqueClose[0];
                                //     }
                                // } else {
                                //     responseDt.vendorTimeEveryday = 0;
                                // }

                                responseObj.vendorTime = vendorTimeArr;



                                responseDt.push(responseObj);
                                var vendrId = (restaurant._id).toString();
                                vendorIds.push(vendrId);
                            }

                            //Restaurant
                            response_data.vendor = responseDt;
                            response_data.promoCodeDetails = promoCodeDetails;

                            //  console.log('catIdArr', allCatIdArr);
                            //Category Data

                            console.log('totalRes', totalRes);
                            console.log('totalCutOffer', totalCutOffer);

                            if (Number(totalRes) == Number(totalCutOffer)) {
                                await offerBannerSchema.updateOne({ _id: bannerId }, {
                                    $set: { isActive: false }
                                });
                            }

                            console.log('response_data', response_data);



                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: `${results.length} nearby restaurants found.`,
                                response_data: response_data
                            })

                        } else {
                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: 'No nearby restaurants found.',
                                response_data: response_data
                            })
                        }
                    }
                });
        }
    },
    //Customer Cart Order Validation
    cartOrderValidation: async (data, callBack) => {
        if (data) {

            console.log('data', data);
            // return;

            var vendorId = data.vendorId;
            var items = data.items;
            var appType = data.appType;


            if (appType == 'ANDROID') {
                var itemObj = JSON.parse(items);
            } else {
                var itemObj = items;
            }

            console.log('itemObj', itemObj);
            // return;

            var itemIdWrng = [];
            var itemExtraIdWrng = [];
            if (itemObj.length > 0) {
                for (let itmObj of itemObj) {

                    var itemsVal = await itemSchema.findOne({ _id: itmObj.itemId });


                    //console.log(itemsVal);
                    var itemsObj = {};
                    itemsObj.itemId = itemsVal._id
                    itemsObj.categoryId = itemsVal.categoryId
                    itemsObj.itemName = itemsVal.itemName
                    itemsObj.type = itemsVal.type
                    itemsObj.price = itemsVal.price
                    itemsObj.description = itemsVal.description;
                    itemsObj.waitingTime = itemsVal.waitingTime;
                    itemsObj.discountType = itemsVal.discountType;
                    itemsObj.discountAmount = itemsVal.discountAmount;
                    itemsObj.discountedPrice = itemsVal.price;
                    var orgAmount = itemsVal.price;
                    var disAmount = itemsVal.discountAmount;
                    var disType = itemsVal.discountType;
                    if (itemsVal.discountType == 'PERCENTAGE') {
                        itemsObj.discountedPrice = (Number(orgAmount) - (Number(orgAmount) * Number(disAmount) / 100));
                    } else if (disType == 'FLAT') {
                        itemsObj.discountedPrice = (Number(orgAmount) - Number(disAmount));
                    }


                    var itemOptions = itemsVal.itemOptions;
                    var itmOptionArr = [];
                    var itmOptionNameArr = [];
                    var itmOptionChildNameArr = [];
                    if (itemOptions.length > 0) {
                        for (let itemOption of itemOptions) {
                            if (itemOption.isActive == true) {
                                itmOptionNameArr.push(itemOption.optionTitle);
                                var itmOptionObj = {
                                    isActive: true,
                                    optionTitle: itemOption.optionTitle
                                }
                                var arrOptionArr = [];
                                var arrOp = itemOption.arrOptions;

                                if (arrOp.length > 0) {
                                    for (let arrOpVal of arrOp) {
                                        if (arrOpVal.isActive == true) {
                                            itmOptionChildNameArr.push(arrOpVal.name);
                                            var arrOptionArrObj = {
                                                isActive: true,
                                                name: arrOpVal.name
                                            };

                                            arrOptionArr.push(arrOptionArrObj);

                                        }
                                    }
                                }
                                itmOptionObj.arrOptions = arrOptionArr;

                                itmOptionArr.push(itmOptionObj);

                            }

                        }

                    }
                    itemsObj.itemOptions = itmOptionArr;
                    var extraitem = await ItemExtraSchema.find({ itemId: itemsVal._id, isActive: true }, { _id: 1, itemName: 1, price: 1, isActive: 1 });
                    // console.log('extraitem',extraitem);
                    itemsObj.itemExtras = extraitem;

                    //CHECK NAME

                    if (itemsVal.itemName != itmObj.name) {
                        itemIdWrng.push(itemsVal._id);

                        console.log('Item Name wrong');
                    }

                    //CHECK PRICE
                    console.log('itemsObj.discountedPrice', itemsObj.discountedPrice);
                    console.log('itmObj.quantity', itmObj.quantity);
                    console.log('itmObj.price', itmObj.price);
                    if (Number(itemsObj.discountedPrice) != Number(itmObj.price)) {
                        itemIdWrng.push(itemsVal._id);

                        console.log('Item Price wrong');
                    }

                    console.log('data.promocode', data.promocodeId);
                    console.log('data.discount', data.discount);

                    //Check Promo Code
                    if ((data.promocode != undefined) && (data.promocode != '')) {
                        var promoCheck = await checkPromoCode(vendorId, data.promocode, data, data.discount)

                        if (promoCheck == 'error') {
                            itemIdWrng.push(itemsVal._id);

                            console.log('Item Promo code wrong');
                        }

                    }

                    //STATUS

                    if ((itemsVal.isActive != true) || (itemsVal.isActive != true)) {

                        itemIdWrng.push(itemsVal._id);

                        console.log('Item availability wrong.');
                    }

                    //ITEM OPTIONS
                    if (itmObj.itemOption != undefined) {
                        if (itmObj.itemOption.length > 0) {
                            for (let itemOp of itmObj.itemOption) {

                                if (itmOptionNameArr.includes(itemOp.optionTitle)) {

                                    if (itemOp.arrOptions.length > 0) {
                                        for (let opName of itemOp.arrOptions) {

                                            if (itmOptionChildNameArr.includes(opName.name)) {

                                            } else {
                                                itemIdWrng.push(itemsVal._id);

                                                console.log('Item option wrong two.');
                                            }

                                        }
                                    }

                                } else {
                                    itemIdWrng.push(itemsVal._id);

                                    console.log('Item option wrong one.');
                                }
                            }
                        }
                    }

                    //ITEM EXTRAS
                    if (itmObj.menuExtra != undefined) {
                        if (itmObj.menuExtra.length > 0) {
                            for (let itemEx of itmObj.menuExtra) {


                                var extraitem = await ItemExtraSchema.findOne({ _id: itemEx._id, itemName: itemEx.itemName, isActive: true, price: itemEx.price });

                                if (extraitem == null) {
                                    itemIdWrng.push(itemsVal._id);

                                    itemExtraIdWrng.push(itemEx._id);

                                    console.log('Item extra wrong one.');
                                }
                            }
                        }
                    }


                }

                if ((itemIdWrng.length > 0) || (itemExtraIdWrng.length > 0)) {

                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Some of the cart items are not available right now.',
                        response_data: {
                            itemId: itemIdWrng.filter(onlyUnique),
                            itemExtraId: itemExtraIdWrng.filter(onlyUnique)
                        }
                    })

                } else {
                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Cart successfully validated.',
                        response_data: {
                            itemId: itemIdWrng.filter(onlyUnique),
                            itemExtraId: itemExtraIdWrng.filter(onlyUnique)
                        }
                    })
                }

            } else {
                callBack({
                    success: false,
                    STATUSCODE: 422,
                    message: 'Something went wrong.',
                    response_data: {}
                })
            }


        }
    },
    //Customer Post Order API
    postOrder: async (data, callBack) => {
        if (data) {

            var vendorId = data.vendorId;
            var items = data.items;
            var latt = data.latitude;
            var long = data.longitude;
            var appType = data.appType;
            var paymentRef = data.paymentReference;

            var checkJson = false

            if (appType == 'ANDROID') {
                var checkJson = isJson(items);
            } else {
                checkJson = true;
            }



            var checkJson = true;

            var paymentCheck = await paymentReferenceSchema.findOne({ reference: paymentRef, paymentStatus: 'COMPLETE' });



            if (paymentCheck != null) {
                if (checkJson == true) {

                    if (appType == 'ANDROID') {
                        var itemObj = JSON.parse(items);
                    } else {
                        var itemObj = items;
                    }

                    var errorCheck = 0;
                    var orderDetailsItm = [];
                    var itemsIdArr = [];
                    for (item of itemObj) {
                        var orderDetailsItmObj = {};
                        if ((item.name == undefined) || (item.name == '') || (item.quantity == undefined) || (item.quantity == '') || (item.price == undefined) || (item.price == '') || (item.itemId == undefined) || (item.itemId == '')) {
                            errorCheck++;
                        } else {
                            //Items Check
                            itemsIdArr.push(item.itemId);

                            orderDetailsItmObj.itemId = item.itemId;
                            orderDetailsItmObj.item = item.name;
                            orderDetailsItmObj.quantity = item.quantity;
                            orderDetailsItmObj.itemPrice = item.price;
                            orderDetailsItmObj.totalPrice = (Number(item.price) * Number(item.quantity));
                            orderDetailsItmObj.itemOptions = item.itemOption;
                            orderDetailsItmObj.itemExtras = item.menuExtra;
                            orderDetailsItm.push(orderDetailsItmObj);
                        }

                    }

                    if (errorCheck == 0) {

                        vendorSchema.findOne({
                            _id: vendorId,
                            isActive: true,
                            isDisabled: { $ne: true }
                        })
                            .exec(async function (err, results) {
                                if (err) {
                                    console.log('err', err);
                                    callBack({
                                        success: false,
                                        STATUSCODE: 500,
                                        message: 'Internal DB error',
                                        response_data: {}
                                    });
                                } else {
                                    if (results != null) {


                                        var estimatedDeliveryTime = data.estimatedDeliveryTime;
                                        var foodReadyTime = data.foodReadyTime;
                                        var deliveryTime = data.deliveryTime;


                                        var orderNo = await generateOrder();

                                        var ordersObj = {
                                            vendorId: data.vendorId,
                                            customerId: data.customerId,
                                            orderNo: orderNo,
                                            orderTime: new Date(),
                                            orderStatusChangeTime: new Date(),
                                            estimatedDeliveryTime: estimatedDeliveryTime,
                                            foodReadyTime: foodReadyTime,
                                            deliveryTime: deliveryTime,

                                            deliveryHouseNo: data.deliveryHouseNo,
                                            deliveryLandmark: data.deliveryLandmark,
                                            deliveryCountryCode: data.deliveryCountryCode,
                                            deliveryPhone: data.deliveryPhone,
                                            deliveryAddressType: data.deliveryAddressType,
                                            deliveryFullAddress: data.deliveryFullAddress,
                                            deliveryLat: data.deliveryLat,
                                            deliveryLong: data.deliveryLong,

                                            userType: data.userType,
                                            guestEmail: data.guestEmail,
                                            guestCountryCode: data.guestCountryCode,
                                            guestPhone: data.guestPhone,
                                            guestName: data.guestName,
                                            orderType: 'NORMAL',
                                            deliveryPreference: data.deliveryPreference,
                                            paymentType: data.paymentType,
                                            orderStatus: 'NEW',
                                            price: data.price,
                                            discount: data.discount,
                                            finalPrice: data.finalPrice,
                                            specialInstruction: data.specialInstruction,
                                            promocodeId: data.promocodeId,
                                            promocode: data.promocode
                                        }

                                        //PROMO CODE BUDGET START
                                        if ((data.promocodeId != '') || (data.promocodeId != undefined)) {
                                            var promoDiscount = data.discount;

                                            var promoCodeDt = await promoCodeSchema.findOne({ promoCode: data.promocodeId });

                                            if (promoCodeDt != null) {
                                                if (promoCodeDt.totalBudget != '') {
                                                    var currentOrderTotal = Number(promoCodeDt.currentOrderTotal);
                                                    var totalBudget = Number(promoCodeDt.totalBudget);
                                                    var totalCurrentBudget = (Number(currentOrderTotal) + Number(promoDiscount));

                                                    var updatePromoBudget = {
                                                        currentOrderTotal: totalCurrentBudget
                                                    }

                                                    if (totalCurrentBudget >= totalBudget) {
                                                        updatePromoBudget.isActive = false;

                                                        var checkBanner = await offerBannerSchema.findOne({ promoCodeId: promoCodeDt._id });

                                                        if (checkBanner != null) {
                                                            await offerBannerSchema.updateOne({ _id: checkBanner._id }, {
                                                                $set: { isActive: false }
                                                            });
                                                        }

                                                    }

                                                    await promoCodeSchema.updateOne({ _id: promoCodeDt._id }, {
                                                        $set: updatePromoBudget
                                                    });


                                                }
                                            }


                                        }

                                        //PROMO CODE BUDGET END

                                        if (data.paymentType == 'COD') {
                                            ordersObj.paymentStatus = 'COMPLETE'
                                        } else {
                                            ordersObj.paymentStatus = 'CUSTOMER_PAID'
                                        }


                                        new orderSchema(ordersObj).save(async function (err, result) {
                                            if (err) {
                                                console.log(err);
                                                callBack({
                                                    success: false,
                                                    STATUSCODE: 500,
                                                    message: 'Internal DB error',
                                                    response_data: {}
                                                });
                                            } else {
                                                var orderId = result._id;
                                                var orderDetailsArr = [];
                                                var orderDetailsIdsArr = [];
                                                var orderDetailsCount = orderDetailsItm.length;
                                                var c = 0;
                                                for (let orderdetails of orderDetailsItm) {
                                                    c++;
                                                    var orderEnter = orderdetails;
                                                    orderEnter.orderId = orderId;

                                                    // console.log(orderEnter);

                                                    orderDetailsArr.push(orderEnter);

                                                    new OrderDetailSchema(orderEnter).save(async function (err, results) {
                                                        orderDetailsIdsArr.push(results._id);

                                                        orderSchema.update({ _id: orderId }, {
                                                            $set: { orderDetails: orderDetailsIdsArr }
                                                        }, function (err, upres) {
                                                            if (err) {
                                                                console.log(err);
                                                            } else {
                                                                // console.log(res);
                                                            }
                                                        });
                                                    })
                                                }



                                                //Payment Table
                                                var paymentObj = {
                                                    vendorId: vendorId,
                                                    orderId: orderId,
                                                    totalAmount: data.price,
                                                    customerPaymentReference: data.paymentReference,
                                                    customerPaymentAuthorizationCode: data.paymentAuthorizationCode,
                                                    customePaymentSignature: data.paymentSignature,
                                                    customerPaymentCustomerCode: data.paymentCustomerCode,
                                                    customerPaymentTime: new Date(),
                                                    vendorPaymentReference: '',
                                                    vendorPaymentTransferCode: '',
                                                    vendorPaymentStatus: 'INITIATE',
                                                    vendorPaymentTime: new Date()
                                                }

                                                var vendorPaymentSettings = await vendorPaymentSettingSchema.findOne({ vendorId: vendorId });

                                                if (vendorPaymentSettings != null) {
                                                    var vendorPercentage = vendorPaymentSettings.paymentPercentage;

                                                } else {
                                                    var vendorPercentage = config.payment.defaultPercentage;
                                                }

                                                paymentObj.vendorAmount = Number(Number(data.price) * Number(vendorPercentage) / 100)

                                                new paymentSchema(paymentObj).save(async function (err, paymentResults) {
                                                    console.log('paymentResults', paymentResults);
                                                })

                                                //Payment Table



                                                //NOTIFICATION SETTINGS CHECK
                                                var checkNotSettings = await checkNotificationSettings(data.vendorId, 'NewOrder');



                                                //SEND PUSH MESSAGE

                                                //Fetch Current Count
                                                var vendorOwnerData = await vendorOwnerSchema.findOne({ vendorId: data.vendorId });
                                                var currentCount = vendorOwnerData.badgeCount;
                                                var newCount = Number(Number(currentCount) + 1);

                                                //AUTO NOTIFICATION
                                                var autoNotificationFetch = await autoNotificationSchema.findOne({ type: 'New order' });
                                                if (autoNotificationFetch != null) {
                                                    var pushMessage = autoNotificationFetch.content;
                                                } else {
                                                    var pushMessage = 'You have received a new order'
                                                }


                                                var receiverId = data.vendorId;
                                                var pushDataset = {
                                                    orderNo: orderNo,
                                                    title: 'New order',
                                                    type: 'NEW',
                                                    orderId: orderId,
                                                    badgeCount: newCount,
                                                    messageType: 'order'
                                                }

                                                if (checkNotSettings == true) {
                                                    sendPush(receiverId, pushMessage, pushDataset);
                                                }
                                                //ADD DATA IN NOTIFICATION TABLE
                                                var userNotificationData = {
                                                    userId: receiverId,
                                                    orderId: orderId,
                                                    userType: 'VENDOR',
                                                    title: 'New order',
                                                    type: 'NEW',
                                                    content: pushMessage,
                                                    isRead: 'NO',
                                                    automatic: 'YES'
                                                }

                                                await vendorOwnerSchema.updateOne({ vendorId: receiverId }, {
                                                    $set: {
                                                        badgeCount: newCount
                                                    }
                                                });
                                                new UserNotificationSchema(userNotificationData).save(async function (err, resultNt) {
                                                    console.log('err', err);
                                                    console.log('result', resultNt);
                                                });




                                                var respOrder = {};
                                                respOrder.order = result;
                                                respOrder.orderDetails = orderDetailsArr;

                                                //SAVE LOG
                                                var logObj = {
                                                    customerId: data.customerId,
                                                    type: 'Customer Order Post',
                                                    log: 'Customer posted an order',
                                                    addedTime: new Date()
                                                }
                                                saveCustomerLog(logObj);


                                                callBack({
                                                    success: true,
                                                    STATUSCODE: 200,
                                                    message: 'Order Updated Successfully.',
                                                    response_data: respOrder
                                                });

                                            }
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

                            });



                    } else {
                        console.log('Invalid items object format');
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Validation failed.',
                            response_data: {}
                        });
                    }

                } else {
                    console.log('Invalid items object format');
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Validation failed.',
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

        }
    },
    //Customer submit review
    submitReview: (data, callBack) => {
        if (data) {
            var vendorId = data.vendorId;

            vendorSchema
                .findOne({ _id: vendorId, isDisabled: { $ne: true } })
                .then((vendor) => {
                    if (vendor != null) {

                        vendorReviewSchema
                            .find({ vendorId: vendorId })
                            .then((vendorRev) => {

                                var totalReviewCount = vendorRev.length;
                                var avrgRating = vendor.rating;

                                console.log('totalReviewCount', totalReviewCount);
                                console.log('avrgRating', avrgRating);


                                if (data.userType == 'CUSTOMER') {
                                    var customerId = data.customerId;
                                } else {
                                    var customerId = '';
                                }

                                var customerComment = {
                                    customer: data.customerComment
                                }

                                var insertReview = {
                                    vendorId: vendorId,
                                    customerId: customerId,
                                    customerName: data.customerName,
                                    comment: customerComment,
                                    customerRating: data.customerRating
                                }

                                new vendorReviewSchema(insertReview).save(async function (err, result) {
                                    if (err) {
                                        console.log(err);
                                        callBack({
                                            success: false,
                                            STATUSCODE: 500,
                                            message: 'Internal DB error',
                                            response_data: {}
                                        });
                                    } else {

                                        var totalReview = ((Number(totalReviewCount) * Number(avrgRating)) + Number(data.customerRating));
                                        var totalCountnw = (Number(totalReviewCount) + 1);


                                        var avrgRvw = (Number(totalReview) / Number(totalCountnw));


                                        vendorSchema.update({ _id: vendorId }, {
                                            $set: { rating: avrgRvw }
                                        }, function (err, res) {
                                            if (err) {
                                                callBack({
                                                    success: false,
                                                    STATUSCODE: 500,
                                                    message: 'Internal DB error',
                                                    response_data: {}
                                                });
                                            } else {
                                                if (res.nModified == 1) {

                                                    if (data.userType == 'CUSTOMER') {
                                                        var customerId = data.customerId;

                                                        //SAVE LOG
                                                        var logObj = {
                                                            customerId: customerId,
                                                            type: 'Customer Review Post',
                                                            log: 'Customer posted a review',
                                                            addedTime: new Date()
                                                        }
                                                        saveCustomerLog(logObj);
                                                    }


                                                    callBack({
                                                        success: true,
                                                        STATUSCODE: 200,
                                                        message: 'Review added successfully.',
                                                        response_data: {}
                                                    });
                                                }

                                            }
                                        });

                                    }
                                })


                            });


                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })




        }
    },
    //Customer Search API
    customerSearch: async (data, callBack) => {
        if (data) {
            var latt = data.body.latitude;
            var long = data.body.longitude;
            var userType = data.body.userType;
            var searchVal = data.body.search;
            var responseDt = [];
            var response_data = {};

            var adminSetting = await adminSettingSchema.findOne({ type: 1 });

            // console.log(data.body);
            //  console.log(searchVal);

            //SEARCH BY RESTAURANT NAME
            vendorSchema.find({
                restaurantName: { '$regex': searchVal, '$options': 'i' },
                isActive: true,
                isDisabled: { $ne: true }
            })
                .populate('vendorOpenCloseTime')
                .exec(async function (err, vendorresults) {
                    if (err) {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    } else {
                        var vendorIdres = [];

                        if (vendorresults.length > 0) {
                            for (let vendorRes of vendorresults) {
                                vendorIdres.push(vendorRes._id);
                            }
                        }

                        //SEARCH BY ITEM
                        itemSchema.find({
                            itemName: { '$regex': searchVal, '$options': 'i' },
                            isActive: true, isApprove: true
                        })
                            .then(function (itemresponse) {
                                if (itemresponse.length > 0) {
                                    for (let itemRes of itemresponse) {
                                        vendorIdres.push(itemRes.vendorId);
                                    }
                                }

                                //SEARCH BY CATEGORY NAME

                                categorySchema.find({
                                    categoryName: { '$regex': searchVal, '$options': 'i' }, isActive: true, categoryType: { $ne: 'FIXED' }
                                })
                                    .sort({ sortOrder: 'asc' })
                                    .then(async (catresps) => {
                                        if (catresps.length > 0) {
                                            for (let catresp of catresps) {

                                                var itemsCat = await itemSchema.find({ categoryId: catresp._id, isActive: true, isApprove: true });

                                                if (itemsCat.length > 0) {
                                                    for (let itemCt of itemsCat) {
                                                        vendorIdres.push(itemCt.vendorId);
                                                    }
                                                }

                                            }
                                        }
                                        console.log('vendorIdres', vendorIdres);
                                        vendorSchema.find({
                                            _id: { $in: vendorIdres },
                                            location: {
                                                $near: {
                                                    $maxDistance: adminSetting.availabilityRadiusHome,
                                                    $geometry: {
                                                        type: "Point",
                                                        coordinates: [long, latt]
                                                    }
                                                }
                                            },
                                            isActive: true,
                                            isDisabled: { $ne: true }
                                        })
                                            .populate('vendorOpenCloseTime')
                                            .then(async function (results) {
                                                // console.log(results);
                                                // return;
                                                if (results.length > 0) {
                                                    var vendorIds = [];
                                                    for (let restaurant of results) {
                                                        var responseObj = {};
                                                        responseObj = {
                                                            id: restaurant._id,
                                                            name: restaurant.restaurantName,
                                                            description: restaurant.description,
                                                            logo: `${config.serverhost}:${config.port}/img/vendor/${restaurant.logo}`,
                                                            rating: parseFloat((restaurant.rating).toFixed(1)),
                                                            delivery: restaurant.delivery
                                                        };

                                                        //CLOSE & CATEGORY
                                                        responseObj.restaurantClose = restaurant.restaurantClose;
                                                        var mapvendorCatArr = await mappingVendorCategorySchema.find({ vendorId: restaurant._id });

                                                        var catIdArr = [];
                                                        if (mapvendorCatArr.length > 0) {
                                                            for (let mapvendorVal of mapvendorCatArr) {
                                                                var categoryId = mapvendorVal.vendorCategoryId.toString();
                                                                catIdArr.push(categoryId);
                                                            }
                                                        }
                                                        responseObj.category = await vendorCategorySchema.find({ _id: { $in: catIdArr }, isActive: true }).sort({ sortOrder: 'asc' });
                                                        //CLOSE & CATEGORY
                                                        // console.log(restaurant.location.coordinates);

                                                        //Calculate Distance
                                                        var sourceLat = restaurant.location.coordinates[1];
                                                        var sourceLong = restaurant.location.coordinates[0];

                                                        var destLat = latt;
                                                        var destLong = long;
                                                        responseObj.distance = await getDistanceinMtr(sourceLat, sourceLong, destLat, destLong);
                                                        // console.log(responseObj);

                                                        //Get Favorites (Only for Genuine Customers, No Guest)
                                                        if (userType == 'GUEST') {
                                                            responseObj.favorite = 0;
                                                        } else {
                                                            var customerId = data.body.customerId;
                                                            var vendorId = restaurant._id;
                                                            responseObj.favorite = await vendorFavouriteSchema.countDocuments({ vendorId: vendorId, customerId: customerId });
                                                        }


                                                        //Open time
                                                        var vendorTimeArr = [];
                                                        var openTimeArr = [];
                                                        var closeTimeArr = [];
                                                        if (restaurant.vendorOpenCloseTime.length > 0) {
                                                            if (restaurant.vendorOpenCloseTime.length == 7) {
                                                                var everydayCheck = 1;
                                                            } else {
                                                                var everydayCheck = 0;
                                                            }


                                                            for (let vendorTime of restaurant.vendorOpenCloseTime) {
                                                                var vendorTimeObj = {};
                                                                //  console.log(vendorTime);
                                                                if (everydayCheck == 1) {

                                                                    openTimeArr.push(vendorTime.openTime);
                                                                    closeTimeArr.push(vendorTime.closeTime);
                                                                }
                                                                //OPEN TIME CALCULATION
                                                                var openTimeAMPM = '';
                                                                var openTimeHours = '';
                                                                var openTimeMin = '';
                                                                if (vendorTime.openTime < 720) {
                                                                    var num = vendorTime.openTime;
                                                                    openTimeAMPM = 'am';
                                                                } else {
                                                                    var num = (vendorTime.openTime - 720);
                                                                    openTimeAMPM = 'pm';
                                                                }

                                                                var openHours = (num / 60);
                                                                var openrhours = Math.floor(openHours);
                                                                var openminutes = (openHours - openrhours) * 60;
                                                                var openrminutes = Math.round(openminutes);

                                                                openTimeHours = openrhours;
                                                                openTimeMin = openrminutes;

                                                                if (openTimeMin < 10) {
                                                                    openTimeMin = `${openTimeMin}0`
                                                                }

                                                                //CLOSE TIME CALCULATION
                                                                var closeTimeAMPM = '';
                                                                var closeTimeHours = '';
                                                                var closeTimeMin = '';
                                                                if (vendorTime.closeTime < 720) {
                                                                    var num = vendorTime.closeTime;
                                                                    closeTimeAMPM = 'am';
                                                                } else {
                                                                    var num = (vendorTime.closeTime - 720);
                                                                    closeTimeAMPM = 'pm';
                                                                }

                                                                var closeHours = (num / 60);
                                                                var closerhours = Math.floor(closeHours);
                                                                var closeminutes = (closeHours - closerhours) * 60;
                                                                var closerminutes = Math.round(closeminutes);

                                                                closeTimeHours = closerhours;
                                                                closeTimeMin = closerminutes;

                                                                if (closeTimeMin < 10) {
                                                                    closeTimeMin = `${closeTimeMin}0`
                                                                }

                                                                vendorTimeObj.day = vendorTime.day;
                                                                vendorTimeObj.openTime = `${openTimeHours}:${openTimeMin} ${openTimeAMPM}`
                                                                vendorTimeObj.closeTime = `${closeTimeHours}:${closeTimeMin} ${closeTimeAMPM}`

                                                                vendorTimeArr.push(vendorTimeObj);
                                                            }
                                                        }

                                                        // responseDt.restaurant = restaurantInfo;

                                                        //Everyday Check
                                                        // if (everydayCheck == 1) {
                                                        //     // console.log(openTimeArr);
                                                        //     // console.log(closeTimeArr);
                                                        //     var uniqueOpen = openTimeArr.filter(onlyUnique);
                                                        //     var uniqueClose = closeTimeArr.filter(onlyUnique);
                                                        //     if ((uniqueOpen.length == 1) && (uniqueClose.length == 1)) {
                                                        //         responseDt.vendorTimeEveryday = 1;
                                                        //         responseDt.vendorTimeEverydayStart = uniqueOpen[0];
                                                        //         responseDt.vendorTimeEverydayClose = uniqueClose[0];
                                                        //     }
                                                        // } else {
                                                        //     responseDt.vendorTimeEveryday = 0;
                                                        // }

                                                        responseObj.vendorTime = vendorTimeArr;



                                                        responseDt.push(responseObj);
                                                        vendorIds.push(restaurant._id);
                                                    }

                                                    //Restaurant
                                                    response_data.vendor = responseDt;

                                                    callBack({
                                                        success: true,
                                                        STATUSCODE: 200,
                                                        message: `${results.length} restaurants found.`,
                                                        response_data: response_data
                                                    })

                                                } else {
                                                    callBack({
                                                        success: true,
                                                        STATUSCODE: 200,
                                                        message: 'No nearby restaurants found.',
                                                        response_data: response_data
                                                    })
                                                }
                                            })
                                            .catch(function (error) {
                                                console.log(error);
                                                callBack({
                                                    success: false,
                                                    STATUSCODE: 500,
                                                    message: 'Something went wrong.',
                                                    response_data: {}
                                                })
                                            })
                                    })



                            })
                            .catch(function (error) {
                                console.log(error);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Something went wrong.',
                                    response_data: {}
                                })
                            });
                    }
                });
        }
    },
    //Favourite change API
    favouriteChange: (data, callBack) => {
        if (data) {
            var userType = data.body.userType;
            var responseDt = [];
            var response_data = {};

            var vendorId = data.body.vendorId;
            var customerId = data.body.customerId;
            var favourite = data.body.favourite;

            vendorSchema
                .findOne({ _id: vendorId })
                .then(async (vendor) => {

                    if (vendor != null) {

                        await vendorFavouriteSchema.deleteOne({ customerId: customerId, vendorId: vendorId }, function (err) {
                            if (err) {
                                console.log(err);
                            }
                        });

                        if (favourite == 'YES') {
                            var vendorFavAdd = { customerId: customerId, vendorId: vendorId }
                            new vendorFavouriteSchema(vendorFavAdd).save(async function (err, result) {
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
                                        message: 'Restaurant favourite.',
                                        response_data: {}
                                    });
                                }
                            })
                        } else {
                            callBack({
                                success: true,
                                STATUSCODE: 200,
                                message: 'Restaurant unfavourite.',
                                response_data: {}
                            });
                        }



                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 422,
                            message: 'Restaurant not found.',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                });
        }
    },
    //Favourite list API
    favouriteList: async (data, callBack) => {
        if (data) {
            var userType = data.body.userType;
            var responseDt = [];
            var response_data = {};

            var customerId = data.body.customerId;
            var latt = data.body.latitude;
            var long = data.body.longitude;

            var adminSetting = await adminSettingSchema.findOne({ type: 1 });


            vendorFavouriteSchema
                .find({ customerId: customerId })
                .then(async (vendorfavs) => {
                    var vendorIds = [];
                    if (vendorfavs.length > 0) {
                        for (let vendorfav of vendorfavs) {
                            var vendorId = vendorfav.vendorId.toString();
                            vendorIds.push(vendorId);
                        }
                    }

                    vendorSchema.find({
                        _id: { $in: vendorIds },
                        location: {
                            $near: {
                                $maxDistance: adminSetting.availabilityRadiusFavourite,
                                $geometry: {
                                    type: "Point",
                                    coordinates: [long, latt]
                                }
                            }
                        },
                        isDisabled: { $ne: true }
                    })
                        // .limit(4)
                        .populate('vendorOpenCloseTime')
                        .exec(async function (err, results) {
                            if (err) {
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            } else {
                                // console.log(results);
                                if (results.length > 0) {
                                    var vendorIds = [];
                                    for (let restaurant of results) {
                                        var responseObj = {};
                                        responseObj = {
                                            id: restaurant._id,
                                            name: restaurant.restaurantName,
                                            description: restaurant.description,
                                            logo: `${config.serverhost}:${config.port}/img/vendor/${restaurant.logo}`,
                                            rating: parseFloat((restaurant.rating).toFixed(1)),
                                            favourite: 1,
                                            delivery: restaurant.delivery
                                        };

                                        //CLOSE & CATEGORY
                                        responseObj.restaurantClose = restaurant.restaurantClose;
                                        var mapvendorCatArr = await mappingVendorCategorySchema.find({ vendorId: restaurant._id });

                                        var catIdArr = [];
                                        if (mapvendorCatArr.length > 0) {
                                            for (let mapvendorVal of mapvendorCatArr) {
                                                var categoryId = mapvendorVal.vendorCategoryId.toString();
                                                catIdArr.push(categoryId);
                                            }
                                        }
                                        responseObj.category = await vendorCategorySchema.find({ _id: { $in: catIdArr }, isActive: true });
                                        //CLOSE & CATEGORY

                                        //Calculate Distance
                                        var sourceLat = restaurant.location.coordinates[1];
                                        var sourceLong = restaurant.location.coordinates[0];

                                        var destLat = latt;
                                        var destLong = long;
                                        responseObj.distance = await getDistanceinMtr(sourceLat, sourceLong, destLat, destLong);
                                        // console.log(restaurant.location.coordinates);


                                        //Open time
                                        var vendorTimeArr = [];
                                        var openTimeArr = [];
                                        var closeTimeArr = [];
                                        if (restaurant.vendorOpenCloseTime.length > 0) {
                                            if (restaurant.vendorOpenCloseTime.length == 7) {
                                                var everydayCheck = 1;
                                            } else {
                                                var everydayCheck = 0;
                                            }


                                            for (let vendorTime of restaurant.vendorOpenCloseTime) {
                                                var vendorTimeObj = {};
                                                //  console.log(vendorTime);
                                                if (everydayCheck == 1) {

                                                    openTimeArr.push(vendorTime.openTime);
                                                    closeTimeArr.push(vendorTime.closeTime);
                                                }
                                                //OPEN TIME CALCULATION
                                                var openTimeAMPM = '';
                                                var openTimeHours = '';
                                                var openTimeMin = '';
                                                if (vendorTime.openTime < 720) {
                                                    var num = vendorTime.openTime;
                                                    openTimeAMPM = 'am';
                                                } else {
                                                    var num = (vendorTime.openTime - 720);
                                                    openTimeAMPM = 'pm';
                                                }

                                                var openHours = (num / 60);
                                                var openrhours = Math.floor(openHours);
                                                var openminutes = (openHours - openrhours) * 60;
                                                var openrminutes = Math.round(openminutes);

                                                openTimeHours = openrhours;
                                                openTimeMin = openrminutes;

                                                if (openTimeMin < 10) {
                                                    openTimeMin = `${openTimeMin}0`
                                                }

                                                //CLOSE TIME CALCULATION
                                                var closeTimeAMPM = '';
                                                var closeTimeHours = '';
                                                var closeTimeMin = '';
                                                if (vendorTime.closeTime < 720) {
                                                    var num = vendorTime.closeTime;
                                                    closeTimeAMPM = 'am';
                                                } else {
                                                    var num = (vendorTime.closeTime - 720);
                                                    closeTimeAMPM = 'pm';
                                                }

                                                var closeHours = (num / 60);
                                                var closerhours = Math.floor(closeHours);
                                                var closeminutes = (closeHours - closerhours) * 60;
                                                var closerminutes = Math.round(closeminutes);

                                                closeTimeHours = closerhours;
                                                closeTimeMin = closerminutes;

                                                if (closeTimeMin < 10) {
                                                    closeTimeMin = `${closeTimeMin}0`
                                                }

                                                vendorTimeObj.day = vendorTime.day;
                                                vendorTimeObj.openTime = `${openTimeHours}:${openTimeMin} ${openTimeAMPM}`
                                                vendorTimeObj.closeTime = `${closeTimeHours}:${closeTimeMin} ${closeTimeAMPM}`

                                                vendorTimeArr.push(vendorTimeObj);
                                            }
                                        }

                                        // responseDt.restaurant = restaurantInfo;

                                        //Everyday Check
                                        // if (everydayCheck == 1) {
                                        //     // console.log(openTimeArr);
                                        //     // console.log(closeTimeArr);
                                        //     var uniqueOpen = openTimeArr.filter(onlyUnique);
                                        //     var uniqueClose = closeTimeArr.filter(onlyUnique);
                                        //     if ((uniqueOpen.length == 1) && (uniqueClose.length == 1)) {
                                        //         responseDt.vendorTimeEveryday = 1;
                                        //         responseDt.vendorTimeEverydayStart = uniqueOpen[0];
                                        //         responseDt.vendorTimeEverydayClose = uniqueClose[0];
                                        //     }
                                        // } else {
                                        //     responseDt.vendorTimeEveryday = 0;
                                        // }

                                        responseObj.vendorTime = vendorTimeArr;


                                        responseDt.push(responseObj);

                                    }



                                    callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: `all favourite restaurant.`,
                                        response_data: responseDt
                                    })

                                } else {
                                    callBack({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: 'No restaurants found.',
                                        response_data: responseDt
                                    })
                                }
                            }
                        });

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                });



        }
    },
    //List Address API
    listAddress: (data, callBack) => {
        if (data) {
            var userType = data.body.userType;
            var responseDt = [];
            var response_data = {};

            var customerId = data.body.customerId;


            customerAddressSchema.find({ customerId: customerId })
                .sort({ createdAt: -1 })
                .then((customerAddresses) => {
                    callBack({
                        success: true,
                        STATUSCODE: 200,
                        message: 'Customer delivery address',
                        response_data: { address: customerAddresses }
                    });


                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })






        }
    },
    //Add Address API
    addAddress: (data, callBack) => {
        if (data) {

            var userType = data.body.userType;
            var responseDt = [];
            var response_data = {};

            var customerId = data.body.customerId;

            var addressData = {
                customerId: customerId,
                fullAddress: data.body.fullAddress,
                houseNo: data.body.houseNo,
                landMark: data.body.landMark,
                phone: data.body.phone,
                countryCode: data.body.countryCode,
                addressType: data.body.addressType,
                latitude: data.body.latitude,
                longitude: data.body.longitude
            }

            new customerAddressSchema(addressData).save(async function (err, result) {
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
                        message: 'Address added successfully',
                        response_data: {}
                    });
                }
            });
        }
    },
    //Edit Address API
    editAddress: (data, callBack) => {
        if (data) {
            var userType = data.body.userType;
            var responseDt = [];
            var response_data = {};

            var customerId = data.body.customerId;

            var addressId = data.body.addressId;

            var addressData = {
                customerId: customerId,
                fullAddress: data.body.fullAddress,
                houseNo: data.body.houseNo,
                landMark: data.body.landMark,
                phone: data.body.phone,
                countryCode: data.body.countryCode,
                addressType: data.body.addressType,
                latitude: data.body.latitude,
                longitude: data.body.longitude
            }

            customerAddressSchema.updateOne({ _id: addressId }, {
                $set: addressData
            }, function (err, res) {
                if (err) {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                } else {
                    if (res.nModified == 1) {
                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: 'Address updated successfully',
                            response_data: {}
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
    },
    //Delete Address API
    deleteAddress: (data, callBack) => {
        if (data) {
            var userType = data.body.userType;
            var responseDt = [];
            var response_data = {};

            var customerId = data.body.customerId;
            var addressId = data.body.addressId;


            customerAddressSchema.findOne({ customerId: customerId, _id: addressId })
                .then((customerAddresses) => {
                    if (customerAddresses != null) {

                        customerAddressSchema.deleteOne({ customerId: customerId, _id: addressId }, function (err) {
                            if (err) {
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
                                    message: 'Address deleted successfully',
                                    response_data: {}
                                });
                            }


                        });




                    }


                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })






        }
    },
    //Physical address
    physicalAddressByLatlong: (data, callBack) => {
        if (data) {
            var userType = data.body.userType;
            var responseDt = [];
            var response_data = {};

            var customerId = data.body.customerId;
            var latt = data.body.latitude;
            var long = data.body.longitude;

            var latLong = `${latt},${long}`


            const googleApiKey = config.google.API_KEY;

            var url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + latLong + "&language=en&key=" + googleApiKey + "";
            var request = require('request');
            request.get({
                headers: { 'content-type': 'application/json' },
                url: url
            }, function (error, response, body) {
                if (error) {
                    return reject(error);
                }
                //console.log(body);
                body = JSON.parse(body);

                callBack({
                    success: true,
                    STATUSCODE: 200,
                    message: 'Physical address',
                    response_data: { address: body }
                });


            });



        }
    },
    //Protect guest user
    protectGuestUser: (data, callBack) => {
        if (data) {
            var userType = data.body.userType;
            var responseDt = [];
            var response_data = {};

            let payload = { subject: '123', user: 'GUEST' };
            const authToken = jwt.sign(payload, config.secretKey, { expiresIn: '3600000h' })

            callBack({
                success: true,
                STATUSCODE: 200,
                message: 'Guest token',
                response_data: { authToken: authToken }
            });
        }
    },
    //Get Notification Settings
    getNotificationData: (data, callBack) => {
        if (data) {
            var reqBody = data.body;
            customerSchema
                .findOne({ _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {

                        userNotificationSettingSchema
                            .findOne({ userId: reqBody.customerId })
                            .then(async (usernotSetting) => {

                                if (usernotSetting == null) {
                                    var usernotSettingData = { 'OrderStatusNotification': true, 'PromotionalNotification': true, 'RestaurantOfferNotification': true, 'RestaurantOrderConfirmation': true, 'RestaurantOrderReady': true, 'RestaurantOrderDelivered': true,'RestaurantOrderDelayed': true }
                                } else {
                                    var usernotSettingData = usernotSetting.notificationData;

                                    if(usernotSettingData['RestaurantOrderDelayed'] == undefined) {
                                        usernotSettingData['RestaurantOrderDelayed'] = true;
                                    }

                                }
                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'User Notification',
                                    response_data: { usernotSetting: usernotSettingData }
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            })




                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
    //Update Notification Settings
    updateNotificationData: (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var notificationData = reqBody.notificationData;

            if (typeof notificationData == 'string') {
                notificationDataObj = JSON.parse(notificationData);
            } else {
                notificationDataObj = notificationData;
            }
            customerSchema
                .findOne({ _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {

                        userNotificationSettingSchema
                            .findOne({ userId: reqBody.customerId })
                            .then(async (usernotSetting) => {

                                if (usernotSetting == null) {
                                    var addNotificationData = {
                                        userId: reqBody.customerId,
                                        userType: 'CUSTOMER',
                                        notificationData: notificationDataObj
                                    }

                                    new userNotificationSettingSchema(addNotificationData).save(async function (err, result) {
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
                                                message: 'User notification updated successfully',
                                                response_data: {}
                                            });
                                        }
                                    });
                                } else {
                                    var updateNotificationData = {
                                        notificationData: notificationDataObj
                                    }

                                    userNotificationSettingSchema.update({ userId: reqBody.customerId }, {
                                        $set: updateNotificationData
                                    }, function (err, result) {
                                        if (err) {
                                            console.log(err);
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });
                                        } else {
                                            if (result.nModified == 1) {
                                                callBack({
                                                    success: true,
                                                    STATUSCODE: 200,
                                                    message: 'User notification updated successfully',
                                                    response_data: {}
                                                });
                                            } else {
                                                callBack({
                                                    success: false,
                                                    STATUSCODE: 500,
                                                    message: 'Something went wrong.',
                                                    response_data: {}
                                                })
                                            }

                                        }
                                    });
                                }
                            })
                            .catch((err) => {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            })




                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
    // Notification List
    notificationList: (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            customerSchema
                .findOne({ _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {

                        UserNotificationSchema
                            .find({ userId: reqBody.customerId })
                            .sort({ createdAt: -1 })
                            .then(async (usernotifications) => {



                                callBack({
                                    success: true,
                                    STATUSCODE: 200,
                                    message: 'userNotificatons',
                                    response_data: { notifications: usernotifications, badgeCount: res.badgeCount }
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            })




                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
    // Notification Delete
    notificationDelete: (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var notificationId = reqBody.notificationId;

            customerSchema
                .findOne({ _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {

                        UserNotificationSchema
                            .findOne({ userId: reqBody.customerId, _id: notificationId })
                            .then(async (usernotifications) => {

                                if (usernotifications != null) {

                                    UserNotificationSchema.deleteOne({ _id: notificationId }, async function (err) {
                                        if (err) {
                                            callBack({
                                                success: false,
                                                STATUSCODE: 500,
                                                message: 'Internal DB error',
                                                response_data: {}
                                            });
                                        } else {

                                            var checkUserNot = await UserNotificationSchema.countDocuments({ userId: reqBody.customerId, isRead: 'NO' });

                                            var currentBadge = checkUserNot;

                                            var userResp = await customerSchema.updateOne({ _id: reqBody.customerId }, {
                                                $set: {
                                                    badgeCount: currentBadge
                                                }
                                            });

                                            callBack({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: 'Notification deleted successfully.',
                                                response_data: {}
                                            });
                                        }

                                    });

                                } else {
                                    callBack({
                                        success: false,
                                        STATUSCODE: 422,
                                        message: 'Something went wrong',
                                        response_data: {}
                                    });
                                }



                            })
                            .catch((err) => {
                                console.log(err);
                                callBack({
                                    success: false,
                                    STATUSCODE: 500,
                                    message: 'Internal DB error',
                                    response_data: {}
                                });
                            })




                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
    // Update Notification count
    updateBadgeCount: (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            var notificationId = reqBody.notificationId;

            customerSchema
                .findOne({ _id: reqBody.customerId })
                .then(async (res) => {
                    if (res != null) {

                        UserNotificationSchema.findOne({ _id: notificationId })
                            .then(async (userNot) => {

                                if (userNot != null) {
                                    if (userNot.isRead == 'NO') {
                                        var notificationUp = await UserNotificationSchema.updateOne({ _id: notificationId }, {
                                            $set: {
                                                isRead: 'YES'
                                            }
                                        });

                                        var checkUserNot = await UserNotificationSchema.countDocuments({ userId: reqBody.customerId, isRead: 'NO' });

                                        var currentBadge = checkUserNot;

                                        var userResp = await customerSchema.updateOne({ _id: reqBody.customerId }, {
                                            $set: {
                                                badgeCount: currentBadge
                                            }
                                        });

                                        //SAVE LOG
                                        var logObj = {
                                            customerId: reqBody.customerId,
                                            type: 'Customer Notification Read',
                                            log: `Customer read a notification (${userNot.content})`,
                                            addedTime: new Date()
                                        }
                                        saveCustomerLog(logObj);

                                        callBack({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: 'Push count updated',
                                            response_data: {}
                                        });
                                    } else {
                                        callBack({
                                            success: true,
                                            STATUSCODE: 201,
                                            message: 'Push count updated',
                                            response_data: {}
                                        });
                                    }
                                }

                            })






                    } else {
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    callBack({
                        success: false,
                        STATUSCODE: 500,
                        message: 'Internal DB error',
                        response_data: {}
                    });
                })


        }
    },
    // Get Customer content
    getCustomerContent: (data, callBack) => {
        if (data) {
            var reqBody = data.body;

            if (reqBody.pageName == 'CustomerFaq') {
                customerFaqSchema.find({ userType: 'CUSTOMER' }, { question: 1, answer: 1 })
                    .then(async (faq) => {

                        var contentFaq = {
                            _id: '',
                            pageName: 'CustomerFaq',
                            isActive: true,
                            content: faq
                        }
                        callBack({
                            success: true,
                            STATUSCODE: 200,
                            message: `CustomerFaq Content`,
                            response_data: { content: contentFaq }
                        });
                    })
                    .catch((err) => {
                        console.log(err);
                        callBack({
                            success: false,
                            STATUSCODE: 500,
                            message: 'Internal DB error',
                            response_data: {}
                        });
                    })

            }
        }
    },
}

function generateToken(userData) {

}


//getDistance(start, end, accuracy = 1)
function getDistanceinMtr(sourceLat, sourceLong, destinationLat, destinationLong) {
    return new Promise(function (resolve, reject) {
        const geolib = require('geolib');

        var distanceCal = geolib.getDistance(
            { latitude: sourceLat, longitude: sourceLong },
            { latitude: destinationLat, longitude: destinationLong },
            1
        );

        //  console.log(distanceCal);
        var distanceStr = '';
        if (Number(distanceCal) > 1000) {
            distanceStr += Math.round((Number(distanceCal) / 1000));
            distanceStr += ' km away'
        } else {
            distanceStr = distanceCal
            distanceStr += ' mtrs away'
        }


        return resolve(distanceStr);

    });
}

function restaurantCategoryItem(data, vendorId, categoryId) {
    return new Promise(function (resolve, reject) {
        var resp = {};

        var itemSerachParam = {
            vendorId: vendorId,
            isActive: true,
            isApprove: true
        }

        var sortCond = { discountAmount: 'desc' };
        if (categoryId == '1') { //ALL ITEMS

        } else if (categoryId == '2') { //OFFERS
            itemSerachParam.discountType = { $in: ['PERCENTAGE', 'FLAT'] }
        } else {
            itemSerachParam.categoryId = categoryId;
        }


        if (data.sort == 'POPULARITY') {
            sortCond = { popularity: 'desc' }
        }

     //   console.log('itemSerachParam',itemSerachParam);
        itemSchema.find(itemSerachParam)
            .sort(sortCond)
            .exec(async function (err, results) {
                if (err) {
                    console.log(err);
                    return resolve('err');
                } else {
                   // console.log('All Items',results);
                    var itemsArr = [];
                    if (results.length > 0) {

                        
                        var offrCheck = 0;

                        var categoryIdArr = [];


                        for (let itemsVal of results) {

                            //console.log(itemsVal);
                            var itemsObj = {};
                            itemsObj.itemId = itemsVal._id
                            itemsObj.categoryId = itemsVal.categoryId
                            itemsObj.itemName = itemsVal.itemName
                            itemsObj.type = itemsVal.type
                            itemsObj.price = itemsVal.price
                            itemsObj.description = itemsVal.description;
                            itemsObj.waitingTime = itemsVal.waitingTime;
                            itemsObj.discountType = itemsVal.discountType;
                            itemsObj.discountAmount = itemsVal.discountAmount;
                            itemsObj.discountedPrice = itemsVal.price;
                            var orgAmount = itemsVal.price;
                            var disAmount = itemsVal.discountAmount;
                            var disType = itemsVal.discountType;
                            if (itemsVal.discountType == 'PERCENTAGE') {
                                offrCheck++;
                                console.log('amount', orgAmount, disAmount)
                                itemsObj.discountedPrice = (Number(orgAmount) - (Number(orgAmount) * Number(disAmount) / 100));
                            } else if (disType == 'FLAT') {
                                offrCheck++;
                                itemsObj.discountedPrice = (Number(orgAmount) - Number(disAmount));
                            }
                            itemsObj.menuImage = `${config.serverhost}:${config.port}/img/vendor/${itemsVal.menuImage}`;

                            var itemOptions = itemsVal.itemOptions;
                            var itmOptionArr = [];
                            if (itemOptions.length > 0) {
                                for (let itemOption of itemOptions) {
                                    if (itemOption.isActive == true) {
                                        var itmOptionObj = {
                                            isActive: true,
                                            optionTitle: itemOption.optionTitle
                                        }
                                        var arrOptionArr = [];
                                        var arrOp = itemOption.arrOptions;

                                        if (arrOp.length > 0) {
                                            for (let arrOpVal of arrOp) {
                                                if (arrOpVal.isActive == true) {
                                                    var arrOptionArrObj = {
                                                        isActive: true,
                                                        name: arrOpVal.name
                                                    };

                                                    arrOptionArr.push(arrOptionArrObj);

                                                }
                                            }
                                        }
                                        itmOptionObj.arrOptions = arrOptionArr;

                                        itmOptionArr.push(itmOptionObj);

                                    }

                                }

                            }
                            itemsObj.itemOptions = itmOptionArr;
                            var extraitem = await ItemExtraSchema.find({ itemId: itemsVal._id, isActive: true }, { _id: 1, itemName: 1, price: 1, isActive: 1 });
                            itemsObj.itemExtras = extraitem;

                            itemsArr.push(itemsObj);



                            if (!categoryIdArr.includes(itemsVal.categoryId)) {
                                // console.log(itemsVal.categoryId); 
                                categoryIdArr.push(itemsVal.categoryId);
                                // console.log(categoryIdArr);
                            }

                        }
                    }
                    console.log('--------------------------------------', data.sort);
                    if (data.sort == 'PRICE_ASC') {
                        itemsArr.sort(comparediscountedAmountAsc);
                    } else if (data.sort == 'PRICE_DESC') {
                        itemsArr.sort(comparediscountedAmountDesc);
                    } else if (data.sort == 'DISCOUNT') {

                        itemsArr.sort(comparediscountPrice);
                    }
                    resp.item = itemsArr;

                    console.log('itemsArr',itemsArr);


                    //Category Data

                    var itemSerachParamCat = {
                        vendorId: vendorId,
                        isActive: true,
                        isApprove: true
                    }

                    var itemsAll = await itemSchema.find(itemSerachParamCat);

                    if (itemsAll.length > 0) {
                        var categoryIdArr = [];
                        for (let itm of itemsAll) {
                            categoryIdArr.push(itm.categoryId);
                        }
                    }

                    var categoryData = {}; 
                    var defaultCategory = await categorySchema.find({
                        $or: [{ categoryType: 'FIXED' }, { $and: [{ _id: { $in: categoryIdArr } }, { isActive: true }] }]
                    }, { "categoryName": 1, "image": 1 }).sort({ sortOrder: 1, createdAt: -1 });


                    categoryData.imageUrl = `${config.serverhost}:${config.port}/img/category/`;


                    var defArr = [];
                    if (defaultCategory.length > 0) {
                        for (let def of defaultCategory) {

                            if (def.categoryName == 'All') {
                                var defObj = {}
                                defObj.categoryName = def.categoryName;
                                defObj.image = def.image;
                                defObj._id = '1'

                                defArr.push(defObj);
                            } else if (def.categoryName == 'Offers') {

                                if (offrCheck > 0) { //REQUIREMENT: If Offer item not present then no need to show offer category
                                    var defObj = {}
                                    defObj.categoryName = def.categoryName;
                                    defObj.image = def.image;
                                    defObj._id = '2'

                                    defArr.push(defObj);
                                }

                            } else {
                                var defObj = {}
                                defObj.categoryName = def.categoryName;
                                defObj.image = def.image;
                                defObj._id = def._id;

                                defArr.push(defObj);
                            }

                        }


                    }
                    // var defaultCategory = [
                    //     {
                    //         _id: '1',
                    //         categoryName: 'All',
                    //         image: '1.jpg'
                    //     },
                    //     {
                    //         _id: '2',
                    //         categoryName: 'Offers',
                    //         image: '2.jpg'
                    //     }
                    // ]

                    // var mergedArr = defArr.concat(categoryData.data);

                  //  console.log('defArr', defArr);
                    var categoryDatas = {
                        data: defArr,
                        imageUrl: categoryData.imageUrl
                    }
                  //   console.log('categoryDatas',categoryDatas);
                    resp.category = categoryDatas;

                    // }

                    return resolve(resp);
                }
            })
    });
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function generateOrder() {
    return new Promise(async function (resolve, reject) {

        var order = await orderSchema.findOne({}).sort({ createdAt: 'desc' });

        if (order == null) {
            var lastOrderNo = '';
        } else {
            var lastOrderNo = order.orderNo;
        }
        var startTxt = 'EE';
        var newOrderNo = '';

        if (lastOrderNo == '') {
            newOrderNo = `${startTxt}0001A`;

        } else {

            var orderLength = lastOrderNo.length;

            var lastOrderNoChar = lastOrderNo.charAt((orderLength - 1));
            lastOrderNo = lastOrderNo.slice(0, -1);

            var middleNumber = (lastOrderNo.replace(startTxt, "")).trim();

            var middleNumberTrm = (Number(middleNumber) + 1);
            if (middleNumberTrm < 10) {
                middleNumberTrm = `000${middleNumberTrm}`
            } else if (middleNumberTrm >= 10 && middleNumberTrm < 100) {
                middleNumberTrm = `00${middleNumberTrm}`
            } else if (middleNumberTrm >= 100 && middleNumberTrm < 1000) {
                middleNumberTrm = `0${middleNumberTrm}`
            } else {
                middleNumberTrm = `${middleNumberTrm}`

                if (Number(middleNumberTrm) == 10000) {
                    middleNumberTrm = '0001'
                    var lastOrderNoChar = String.fromCharCode(lastOrderNoChar.charCodeAt(0) + 1);
                }
            }


            newOrderNo = `${startTxt}${middleNumberTrm}${lastOrderNoChar}`;


        }

        return resolve(newOrderNo);
    });
}

function sendPush(receiverId, pushMessage, orderObj) {
    // console.log(receiverId);
    var pushMessage = pushMessage;
    var orderNo = orderObj.orderNo;
    var badgeCount = orderObj.badgeCount;
    vendorOwnerSchema
        .find({ vendorId: receiverId })
        .then(function (allowners) {
            vendorOwnerId = [];
            if (allowners.length > 0) {
                for (let owner of allowners) {
                    vendorOwnerId.push(owner._id);
                }
            }

            //console.log(vendorOwnerId);
            userDeviceLoginSchemaSchema
                .find({ userId: { $in: vendorOwnerId }, userType: 'VENDOR' })
                .then(function (customers) {
                    // console.log(customers);
                    //   return;

                    if (customers.length > 0) {
                        for (let customer of customers) {
                            if (customer.deviceToken != '') {

                                // var msgStr = ",";
                                // msgStr += "~order_no~:~" + orderNo + "~";
                                // var dataset = "{~message~:~" + pushMessage + "~" + msgStr + "}";

                                var deviceToken = customer.deviceToken;

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

                                            console.log('customer', customer);
                                            console.log('push_success_ANDROID', success);

                                        }).catch(async function (err) { //PUSH FAILED

                                            console.log('push_err_ANDROID', err);
                                        });
                                    //ANDROID PUSH END

                                } else if (customer.appType == 'IOS') {

                                    //IOS PUSH START
                                    var iosPushData = {
                                        'badge': badgeCount,
                                        'alert': pushMessage,
                                        'deviceToken': deviceToken,
                                        'pushMode': customer.pushMode,
                                        'pushTo': 'VENDOR',
                                        'dataset': orderObj
                                    }
                                    //SEND PUSH TO IOS [APN]

                                    PushLib.sendPushIOS(iosPushData)
                                        .then(async function (success) { //PUSH SUCCESS
                                            console.log('push_success_IOS', success);

                                        }).catch(async function (err) { //PUSH FAILED
                                            console.log('push_err_IOS', err);
                                        });
                                    //IOS PUSH END

                                }

                            }
                        }
                    }



                })


        })



}

function comparediscountedAmountDesc(a, b) {
    if (a.discountedPrice > b.discountedPrice) {
        return -1;
    }
    if (a.discountedPrice < b.discountedPrice) {
        return 1;
    }
    return 0;
}

function comparediscountedAmountAsc(a, b) {
    if (a.discountedPrice < b.discountedPrice) {
        return -1;
    }
    if (a.discountedPrice > b.discountedPrice) {
        return 1;
    }
    return 0;
}

function comparediscountPrice(a, b) {
    if (a.discountAmount > b.discountAmount) {
        return -1;
    }
    if (a.discountAmount < b.discountAmount) {
        return 1;
    }
    return 0;
}


function checkNotificationSettings(userId, notType) {
    return new Promise(function (resolve, reject) {

        userNotificationSettingSchema.findOne({ userId: userId, userType: 'VENDOR' })
            .then(async (notSetting) => {
                if (notSetting != null) {
                    if (notType == 'NewOrder') {
                        if (notSetting.notificationData.NewOrder == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'PreOrder') {
                        if (notSetting.notificationData.PreOrder == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'OrderNotification') {
                        if (notSetting.notificationData.OrderNotification == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'OrderModification') {
                        if (notSetting.notificationData.OrderModification == true) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    } else if (notType == 'OrderCancellation') {
                        if (notSetting.notificationData.OrderCancellation == true) {
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


function checkPromoCode(vendorId, promoCode, data, totDis) {
    return new Promise(function (resolve, reject) {


        var subTotal = data.subTotal;
        var deliveryCharge = data.deliveryCharge;
        var allTotal = data.allTotal;
        var disTyp = 0;

        var restaurantArr = [];
        restaurantArr.push(vendorId);

        promoCodeSchema.findOne(
            { $and: [{ fromDate: { $lte: new Date() } }, { toDate: { $gte: new Date() } }, { promoCode: promoCode }, { $or: [{ vendorId: { $in: restaurantArr } }, { vendorType: 'ALL' },] }, { isDeleted: { $ne: true } }, { isActive: { $ne: false } }] }
        )
            .then(async (promo) => {
                if (promo != null) {
                    var continueSign = 1;

                    if (continueSign > 0) {

                        //  console.log(promo.promoCategory);
                        if (promo.promoCategory == 'SUB_TOTAL') {
                            var amount = data.subTotal;
                            disTyp = 1;
                        } else if (promo.promoCategory == 'DELIVERY_CHARGE') {
                            var amount = data.deliveryCharge;
                            disTyp = 2;
                        } else {
                            var amount = data.allTotal;
                            disTyp = 3;
                        }



                        //MIN CAP LOGIC
                        if (Number(amount) < Number(promo.promoCodeAmountMinCap)) {
                            return resolve('error');
                        } else {
                            var applyPromoId = (promo._id).toString();


                            var discountAmount = amount;
                            var promoPrice = promo.discountAmount;
                            if (promo.discountType == 'PERCENTAGE') {

                                //MAX CAP LOGIC
                                if (Number(amount) >= Number(promo.promoCodeAmountMaxCap)) {
                                    var amountCartDis = promo.promoCodeAmountMaxCap;
                                } else {
                                    var amountCartDis = amount;
                                }

                                var totalDiscount = (Number(amountCartDis) * Number(promoPrice) / 100);


                                discountAmount = (Number(amount) - totalDiscount); //2700


                            } else if (promo.discountType == 'FLAT') {

                                //MAX CAP LOGIC
                                if (Number(amount) >= Number(promo.promoCodeAmountMaxCap)) {
                                    var amountCartDis = promo.promoCodeAmountMaxCap;
                                } else {
                                    var amountCartDis = amount;
                                }

                                var totalDiscount = Number(promoPrice);


                                discountAmount = (Number(amount) - Number(totalDiscount));
                            }



                            // if ((Number(totalDiscount) >= Number(promo.promoCodeAmountMinCap)) && (Number(totalDiscount) <= Number(promo.promoCodeAmountMaxCap))) {

                            // }
                            //  else {
                            //     callBack({
                            //         success: false,
                            //         STATUSCODE: 422,
                            //         message: `Promo code valid for amount NGN ${promo.promoCodeAmountMinCap} to NGN ${promo.promoCodeAmountMaxCap}`,
                            //         response_data: {}
                            //     });
                            // }
                            if (disTyp == 1) {
                                var subTotalFinal = discountAmount
                                var deliveryChargeFinal = deliveryCharge
                                var allTotalFinal = (Number(discountAmount) + Number(deliveryCharge))
                            } else if (disTyp == 2) {
                                var subTotalFinal = subTotal
                                var deliveryChargeFinal = discountAmount
                                var allTotalFinal = (Number(subTotal) + Number(discountAmount))
                            } else if (disTyp == 3) {
                                var subTotalFinal = subTotal
                                var deliveryChargeFinal = deliveryCharge
                                var allTotalFinal = discountAmount
                            }

                            console.log('allTotalFinal', allTotalFinal);
                            console.log('allTotal', allTotal);
                            console.log('totalDiscount', totalDiscount);


                            if (Number(totalDiscount) == Number(totDis)) {
                                return resolve(totalDiscount);
                            } else {
                                return resolve('error');
                            }
                        }





                    } else {
                        return resolve('error');
                    }




                } else {
                    return resolve('error');
                }
            })
            .catch((error) => {
                console.log(error);
                return resolve('error');
            });


    });

}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function saveCustomerLog(logObj) {

    new customerlogSchema(logObj).save(async function (err, result) {
        if (err) {
            console.log(err);

        } else {
            console.log('Log Saved');
        }

        await customerSchema.updateOne({ _id: logObj.customerId }, {
            $set: {
                lastModified: new Date()
            }
        });
    });
}