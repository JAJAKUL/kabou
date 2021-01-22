const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const mail = require('../../modules/sendEmail');
const { SERVERURL, HOST, PORT, SERVERIMAGEUPLOADPATH, SERVERIMAGEPATH } = require('../../config/bootstrap');
//Session
var session = require('express-session');

var vendorSchema = require('../../schema/Vendor');
var promoCodeSchema = require('../../schema/PromoCode');



module.exports.promoCodeAdd = (req, res) => {
    var user = req.session.user;
    vendorSchema.find({ isDisabled: { $ne: true } })
        .then((vendors) => {
            var promoCodeTypeCondArr = [
                {
                    type: 'SUB_TOTAL',
                    value: 'Sub Total'
                },
                {
                    type: 'DELIVERY_CHARGE',
                    value: 'Delivery Charge'
                },
                {
                    type: 'TOTAL',
                    value: 'Total (All)'
                }
            ]

            // console.log('promoCodeTypeCondArr',promoCodeTypeCondArr);
            // return;
            res.render('promoCode/promoCodeAdd', {
                vendors: vendors,
                layout: false,
                user: user,
                promoCodeTypeCondArr: promoCodeTypeCondArr
            });
        })

}

module.exports.promoCodeAddPost = async (req, res) => {



    // console.log(req.body);
    // return;

    var restaurantArr = req.body.restaurant;
    var discountType = req.body.discountType;
    var discount = req.body.discount;
    var promoCategory = req.body.promoCategory;
    var fromDate = createDateFormatStart(req.body.fromDate);
    var toDate = createDateFormatEnd(req.body.toDate);
    var promoCodeAmountMinCap = req.body.minAmount;
    var promoCodeAmountMaxCap = req.body.maxAmount;
    var promoCodeDesciption = req.body.promoCodeDesciption;
    var promoCode = req.body.promoCode;
    var totalBudget = req.body.totalBudget;
    var usageType = req.body.usageType;


    var promoCodeObj = {
        discountType: discountType,
        discountAmount: discount,
        promoCategory: promoCategory,
        fromDate: fromDate,
        toDate: toDate,
        promoCode: promoCode,
        promoCodeAmountMinCap: promoCodeAmountMinCap,
        promoCodeAmountMaxCap: promoCodeAmountMaxCap,
        promoCodeDesciption: promoCodeDesciption,
        totalBudget: totalBudget,
        isActive: true,
        usageType: usageType,
        customerApplied: []
    }

    if (restaurantArr == undefined) {
        var vendrArr = [];
        promoCodeObj.vendorId = vendrArr
        promoCodeObj.vendorType = 'ALL'
    } else if (!Array.isArray(restaurantArr)) {
        var vendrArr = [];
        vendrArr.push(restaurantArr);
        promoCodeObj.vendorId = vendrArr
        promoCodeObj.vendorType = 'SPECIFIC'
    } else if (Array.isArray(restaurantArr)) {
        promoCodeObj.vendorId = restaurantArr
        promoCodeObj.vendorType = 'SPECIFIC'
    }

    // console.log(promoCodeObj);

    // return;


    new promoCodeSchema(promoCodeObj).save(function (err, banner) {
        if (err) {
            console.log(err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        } else {

            req.flash('msgLog', 'Promo added successfully.');
            req.flash('msgType', 'success');
            res.redirect('/promoCode/promoCodeList');
            return;
        }
    });



}

module.exports.promoCodeList = (req, res) => {
    var user = req.session.user;

    promoCodeSchema
        .find({ isDeleted: { $ne: true } })
        .sort({ sortOrder: 1, createdAt: -1 })
        .then(async (offers) => {

            // console.log(offers);
            // return;
            var dataArr = [];
            if (offers.length > 0) {
                for (let offer of offers) {
                    var codes = {
                        _id: offer._id,
                        discountType: offer.discountType,
                        discountAmount: offer.discountAmount,
                        fromDate: listDateFormat(offer.fromDate),
                        toDate: listDateFormat(offer.toDate),
                        promoCategory: offer.promoCategory,
                        promoCode: offer.promoCode,
                        promoCodeAmountMinCap: offer.promoCodeAmountMinCap,
                        promoCodeAmountMaxCap: offer.promoCodeAmountMaxCap,
                        promoCodeDesciption: offer.promoCodeDesciption,
                        vendorType: offer.vendorType,
                        totalBudget: offer.totalBudget,
                        currentOrderTotal: offer.currentOrderTotal,
                    };


                    // console.log(banners);
                    dataArr.push(codes);
                }
            }

            res.render('promoCode/promoCodeList.ejs', {
                dataArr: dataArr,
                layout: false,
                user: user
            });
        });

}

module.exports.deletePromoCode = (req, res) => {

    var id = req.query.id;
    if (id != undefined) {

        promoCodeSchema
            .findOne({ _id: id })
            .then(async (bannerGet) => {

                promoCodeSchema.updateOne({ _id: id }, {
                    $set: { isDeleted: true, isActive: false }
                }, async function (err, result) {
                    if (err) {
                        console.log(err);
                        req.flash('msgLog', 'Something went wrong.');
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    } else {
                        req.flash('msgLog', 'Promo code updated successfully.');
                        req.flash('msgType', 'success');
                        res.redirect(req.headers.referer);
                        return;
                    }
                });


            });
    }
}



module.exports.promoCodeEdit = async (req, res) => {

    var user = req.session.user;

    var id = req.query.id;

    var responseDt = {};

    if (id != undefined) {


        promoCodeSchema
            .findOne({ _id: id })
            .then(async function (promoCode) {

                if (promoCode != null) {

                    var promoCodeTypeCondArr = [
                        {
                            type: 'SUB_TOTAL',
                            value: 'Sub Total'
                        },
                        {
                            type: 'DELIVERY_CHARGE',
                            value: 'Delivery Charge'
                        },
                        {
                            type: 'TOTAL',
                            value: 'Total (All)'
                        }
                    ]

                    var imagePath = `${SERVERIMAGEPATH}offer/`

                    var vendors = await vendorSchema.find({ isDisabled: { $ne: true } });

                    var dataObj = {
                        fromDate: editDateFormat(promoCode.fromDate),
                        toDate: editDateFormat(promoCode.toDate)
                    }




                    res.render('promoCode/promoCodeEdit.ejs', {
                        promoCode: promoCode, id: id,
                        layout: false,
                        user: user,
                        serverImagePath: imagePath,
                        dataObj: dataObj,
                        vendors: vendors,
                        promoCodeTypeCondArr: promoCodeTypeCondArr
                    });


                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }

            });

    }


}

module.exports.promoCodeEditPost = async (req, res) => {

    var files = req.files;
    var reqBody = req.body;




    var restaurantArr = req.body.restaurant;
    var discountType = req.body.discountType;
    var discount = req.body.discount;
    var promoCategory = req.body.promoCategory;
    var fromDate = createDateFormatStart(req.body.fromDate);
    var toDate = createDateFormatEnd(req.body.toDate);
    var promoCodeAmountMinCap = req.body.minAmount;
    var promoCodeAmountMaxCap = req.body.maxAmount;
    var promoCodeDesciption = req.body.promoCodeDesciption;
    var promoCode = req.body.promoCode;
    var totalBudget = req.body.totalBudget;
    var usageType = req.body.usageType;

    var id = req.body.id;


    var promoCodeObj = {
        discountType: discountType,
        discountAmount: discount,
        promoCategory: promoCategory,
        fromDate: fromDate,
        toDate: toDate,
        promoCode: promoCode,
        promoCodeAmountMinCap: promoCodeAmountMinCap,
        promoCodeAmountMaxCap: promoCodeAmountMaxCap,
        promoCodeDesciption: promoCodeDesciption,
        totalBudget: totalBudget,
        usageType: usageType
    }

    if (restaurantArr == undefined) {
        var vendrArr = [];
        promoCodeObj.vendorId = vendrArr
        promoCodeObj.vendorType = 'ALL'
    } else if (!Array.isArray(restaurantArr)) {
        var vendrArr = [];
        vendrArr.push(restaurantArr);
        promoCodeObj.vendorId = vendrArr
        promoCodeObj.vendorType = 'SPECIFIC'
    } else if (Array.isArray(restaurantArr)) {
        promoCodeObj.vendorId = restaurantArr
        promoCodeObj.vendorType = 'SPECIFIC'
    }


    promoCodeSchema.updateOne({ _id: id }, {
        $set: promoCodeObj
    }, async function (err, result) {
        if (err) {
            console.log(err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        } else {
            req.flash('msgLog', 'Promo code updated successfully.');
            req.flash('msgType', 'success');
            res.redirect('/promoCode/promoCodeList');
            return;
        }
    });


}


module.exports.updateSorting = async (req, res) => {

    var reqBdy = req.body;

    var allIdSort = reqBdy.id;

    if (allIdSort.length > 0) {

        for (const [key, value] of Object.entries(allIdSort)) {

            await promoCodeSchema.updateOne({ _id: value }, {
                $set: { sortOrder: key }
            })
        }
    }

    var responseObj = {
        msg: '',
        body: {}
    };
    res.status(200).json(responseObj)

}

function createDateFormatStart(reqDate) {
    var date = reqDate;

    var monthsTOneArr = [1, 3, 5, 7, 8, 10, 12];

    var dateSpl = date.split("/");

    var month = dateSpl[1];
    var day = dateSpl[0];
    var year = dateSpl[2];


    var dateNew = new Date(`${month}-${day}-${year} 00:00:00`);
    console.log(day);
    console.log(dateNew);

    return dateNew;

}

function createDateFormatEnd(reqDate) {
    var date = reqDate;

    var monthsTOneArr = [1, 3, 5, 7, 8, 10, 12];

    var dateSpl = date.split("/");

    var month = dateSpl[1];
    var day = dateSpl[0];
    var year = dateSpl[2];


    var dateNew = new Date(`${month}-${day}-${year} 11:59:59`);
    console.log(day);
    console.log(dateNew);

    return dateNew;

}

function listDateFormat(date) {
    var dateFormatCheck = date;

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    var day = dateFormatCheck.getDate();

    var month = months[dateFormatCheck.getMonth()];

    var year = dateFormatCheck.getFullYear();

    var dateformat = `${day} ${month}, ${year}`

    return dateformat;
}

function editDateFormat(date) {
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

    return dateformat;
}



