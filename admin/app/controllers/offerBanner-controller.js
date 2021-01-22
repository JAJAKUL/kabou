const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const mail = require('../../modules/sendEmail');
const { SERVERURL, HOST, PORT, SERVERIMAGEUPLOADPATH, SERVERIMAGEPATH } = require('../../config/bootstrap');
//Session
var session = require('express-session');

var vendorSchema = require('../../schema/Vendor');
var offerBannerSchema = require('../../schema/OfferBanner');
var promoCodeSchema = require('../../schema/PromoCode');


module.exports.bannerList = (req, res) => {
    var user = req.session.user;

    offerBannerSchema
        .find({})
        .sort({ sortOrder: 1, createdAt: -1 })
        .then(async (offers) => {

            // console.log(offers);
            // return;
            var bannerArr = [];
            if (offers.length > 0) {
                for (let offer of offers) {
                    var banners = {
                        _id: offer._id,
                        image: offer.image,
                        fromDate: listDateFormat(offer.fromDate),
                        toDate: listDateFormat(offer.toDate),
                        offerText: offer.offerText

                    };


                    // console.log(banners);
                    bannerArr.push(banners);
                }
            }

            // console.log(bannerArr);

            var imagePath = `${SERVERIMAGEPATH}offer/`



            res.render('offerBanner/bannerList.ejs', {
                bannerArr: bannerArr,
                layout: false,
                user: user,
                serverImagePath: imagePath

            });
        });

}

module.exports.add = (req, res) => {
    var user = req.session.user;
    vendorSchema.find({ isDisabled: { $ne: true } })
        .then(async (vendors) => {

            var promoCodeArr = await promoCodeSchema
                .find({ isDeleted: { $ne: true } })
                .sort({ sortOrder: 1, createdAt: -1 });

            res.render('offerBanner/add', {
                vendors: vendors,
                layout: false,
                user: user,
                promoCodeArr: promoCodeArr
            });
        })

}

module.exports.addOfferSubmit = async (req, res) => {

    //  console.log(req.files);

    var files = req.files;

    //     console.log(req.body);
    //    return;


    var offerText = req.body.offerText;
    var fromDate = createDateFormatStart(req.body.fromDate);
    var toDate = createDateFormatEnd(req.body.toDate);

    //Image Upload
    var bannerInfo = await uploadImage(files.banner, 'banner');

    if (bannerInfo != 'error') {

        if (req.body.dropdownType == 'restaurant') {

            var restaurantArr = req.body.restaurant;
            if (restaurantArr == undefined) {
                var offerBannerObj = {
                    vendorId: '',
                    bannerType: '',
                    image: bannerInfo,
                    fromDate: fromDate,
                    toDate: toDate,
                    offerText: offerText,
                    isActive: true
                }


                new offerBannerSchema(offerBannerObj).save(function (err, banner) {
                    if (err) {
                        console.log(err);
                        req.flash('msgLog', 'Something went wrong.');
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    } else {

                        req.flash('msgLog', 'Banner uploaded successfully.');
                        req.flash('msgType', 'success');
                        res.redirect('/offerBanner/bannerList');
                        return;
                    }
                });
            } else if (!Array.isArray(restaurantArr)) {

                var offerBannerObj = {
                    vendorId: restaurantArr,
                    bannerType: restaurantArr,
                    image: bannerInfo,
                    fromDate: fromDate,
                    toDate: toDate,
                    offerText: offerText
                }

                new offerBannerSchema(offerBannerObj).save(function (err, banner) {
                    if (err) {
                        console.log(err);
                        req.flash('msgLog', 'Something went wrong.');
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    } else {

                        req.flash('msgLog', 'Banner uploaded successfully.');
                        req.flash('msgType', 'success');
                        res.redirect('/offerBanner/bannerList');
                        return;
                    }
                });
            } else if (Array.isArray(restaurantArr)) {

                var offerBannerObj = {
                    vendorId: restaurantArr,
                    bannerType: '1',
                    image: bannerInfo,
                    fromDate: fromDate,
                    toDate: toDate,
                    offerText: offerText
                }

                new offerBannerSchema(offerBannerObj).save(function (err, banner) {
                    if (err) {
                        console.log(err);
                        req.flash('msgLog', 'Something went wrong.');
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    } else {

                        req.flash('msgLog', 'Banner uploaded successfully.');
                        req.flash('msgType', 'success');
                        res.redirect('/offerBanner/bannerList');
                        return;
                    }
                });
            }

        } else {
            var promocodeId = req.body.promocode;

            var offerBannerObj = {
                vendorId: '',
                promoCodeId: promocodeId,
                bannerType: 'promocode',
                image: bannerInfo,
                fromDate: fromDate,
                toDate: toDate,
                offerText: offerText
            }


            new offerBannerSchema(offerBannerObj).save(function (err, banner) {
                if (err) {
                    console.log(err);
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                } else {

                    req.flash('msgLog', 'Banner uploaded successfully.');
                    req.flash('msgType', 'success');
                    res.redirect('/offerBanner/bannerList');
                    return;
                }
            });

        }


    } else {
        req.flash('msgLog', 'Something went wrong while uploading the banner.');
        req.flash('msgType', 'danger');
        res.redirect(req.headers.referer);
        return;
    }
}

module.exports.bannerEdit = async (req, res) => {

    var user = req.session.user;

    var bannerId = req.query.id;

    var responseDt = {};

    if (bannerId != undefined) {


        offerBannerSchema
            .findOne({ _id: bannerId })
            .then(async function (banner) {

                if (banner != null) {

                    var imagePath = `${SERVERIMAGEPATH}offer/`

                    var vendors = await vendorSchema.find({ isDisabled: { $ne: true } });

                    var dataObj = {
                        fromDate: editDateFormat(banner.fromDate),
                        toDate: editDateFormat(banner.toDate),
                        offerText: banner.offerText
                    }



                    var promoCodeArr = await promoCodeSchema
                .find({ isDeleted: { $ne: true } })
                .sort({ sortOrder: 1, createdAt: -1 });

                    res.render('offerBanner/bannerEdit.ejs', {
                        banner: banner, bannerId: bannerId,
                        layout: false,
                        user: user,
                        serverImagePath: imagePath,
                        dataObj: dataObj,
                        vendors: vendors,
                        promoCodeArr: promoCodeArr
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

module.exports.editOfferSubmit = async (req, res) => {

    var files = req.files;
    var reqBody = req.body;


    var bannerId = reqBody.bannerId;

    
    var offerText = req.body.offerText;
    var fromDate = createDateFormatStart(req.body.fromDate);
    var toDate = createDateFormatEnd(req.body.toDate);

    console.log(reqBody);
    // return;

    offerBannerSchema
        .findOne({ _id: bannerId })
        .then(async (bannerGet) => {

            if (bannerGet != null) {
                var catData = {}
                //License Upload

                if (files != null) {
                    if (files.banner != undefined) {

                        if (bannerGet.image != '') {
                            var fs = require('fs');
                            var filePath = `${SERVERIMAGEUPLOADPATH}offer/${bannerGet.image}`;
                            fs.unlink(filePath, (err) => {
                                console.log('err', err);
                            });
                        }

                        var bannerInfo = await uploadImage(files.banner, 'banner');

                    } else {
                        var bannerInfo = bannerGet.image;
                    }
                } else {
                    var bannerInfo = bannerGet.image;
                }


                if (bannerInfo != 'error') {


                    if (req.body.dropdownType == 'restaurant') {

                        var restaurantArr = req.body.restaurant;

                    if (restaurantArr == undefined) {
                        var offerBannerObj = {
                            vendorId: '',
                            bannerType: '',
                            image: bannerInfo,
                            fromDate: fromDate,
                            toDate: toDate,
                            offerText: offerText
                        }

                        offerBannerSchema.updateOne({ _id: bannerId }, {
                            $set: offerBannerObj
                        }, async function (err, result) {
                            if (err) {
                                console.log(err);
                                req.flash('msgLog', 'Something went wrong.');
                                req.flash('msgType', 'danger');
                                res.redirect(req.headers.referer);
                                return;
                            } else {
                                req.flash('msgLog', 'Banner updated successfully.');
                                req.flash('msgType', 'success');
                                res.redirect('/offerBanner/bannerList');
                                return;
                            }
                        });



                    } else if (!Array.isArray(restaurantArr)) {

                        var offerBannerObj = {
                            vendorId: restaurantArr,
                            bannerType: restaurantArr,
                            image: bannerInfo,
                            fromDate: fromDate,
                            toDate: toDate,
                            offerText: offerText
                        }

                        offerBannerSchema.updateOne({ _id: bannerId }, {
                            $set: offerBannerObj
                        }, async function (err, result) {
                            if (err) {
                                console.log(err);
                                req.flash('msgLog', 'Something went wrong.');
                                req.flash('msgType', 'danger');
                                res.redirect(req.headers.referer);
                                return;
                            } else {
                                req.flash('msgLog', 'Banner updated successfully.');
                                req.flash('msgType', 'success');
                                res.redirect('/offerBanner/bannerList');
                                return;
                            }
                        });


                    } else if (Array.isArray(restaurantArr)) {

                        var offerBannerObj = {
                            vendorId: restaurantArr,
                            bannerType: '1',
                            image: bannerInfo,
                            fromDate: fromDate,
                            toDate: toDate,
                            offerText: offerText
                        }

                        offerBannerSchema.updateOne({ _id: bannerId }, {
                            $set: offerBannerObj
                        }, async function (err, result) {
                            if (err) {
                                console.log(err);
                                req.flash('msgLog', 'Something went wrong.');
                                req.flash('msgType', 'danger');
                                res.redirect(req.headers.referer);
                                return;
                            } else {
                                req.flash('msgLog', 'Banner updated successfully.');
                                req.flash('msgType', 'success');
                                res.redirect('/offerBanner/bannerList');
                                return;
                            }
                        });
                    }

                } else {

                    var promocodeId = req.body.promocode;

                    var offerBannerObj = {

                        vendorId: '',
                        promoCodeId: promocodeId,
                        bannerType: 'promocode',
                        image: bannerInfo,
                        fromDate: fromDate,
                        toDate: toDate,
                        offerText: offerText
                    }

                    offerBannerSchema.updateOne({ _id: bannerId }, {
                        $set: offerBannerObj
                    }, async function (err, result) {
                        if (err) {
                            console.log(err);
                            req.flash('msgLog', 'Something went wrong.');
                            req.flash('msgType', 'danger');
                            res.redirect(req.headers.referer);
                            return;
                        } else {
                            req.flash('msgLog', 'Banner updated successfully.');
                            req.flash('msgType', 'success');
                            res.redirect('/offerBanner/bannerList');
                            return;
                        }
                    });
                }
                } else {

                    req.flash('msgLog', 'Banner image upload failed.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }
            } else {

                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            }

        })
        .catch((err) => {
            console.log('err', err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        })


}

module.exports.deleteBanner = (req, res) => {

    var bannerId = req.query.id;
    if (bannerId != undefined) {

        offerBannerSchema
            .findOne({ _id: bannerId })
            .then(async (bannerGet) => {

                offerBannerSchema.deleteOne({ _id: bannerId }, function (err) {
                    if (err) {
                        req.flash('msgLog', 'Something went wrong.');
                        req.flash('msgType', 'danger');
                        res.redirect(req.headers.referer);
                        return;
                    } else {


                        var fs = require('fs');
                        var filePath = `${SERVERIMAGEUPLOADPATH}offer/${bannerGet.image}`;
                        fs.unlink(filePath, (err) => {
                            console.log('err', err);
                        });

                        req.flash('msgLog', 'Banner deleted successfully.');
                        req.flash('msgType', 'success');
                        res.redirect(req.headers.referer);
                        return;

                    }
                });


            });
    }
}

module.exports.promoCodeAdd = (req, res) => {
    var user = req.session.user;

    var promoCodeTypeCondArr = [
        {
            type: ' CART_VALUE',
            value: 'CART VALUE'
        }
    ]


    res.render('offerBanner/promoCodeAdd', {
        promoCodeTypeCondArr: promoCodeTypeCondArr,
        layout: false,
        user: user
    });

}

module.exports.updateSorting = async (req, res) => {

    var reqBdy = req.body;

    var allIdSort = reqBdy.id;

    if (allIdSort.length > 0) {

        for (const [key, value] of Object.entries(allIdSort)) {

            await offerBannerSchema.updateOne({ _id: value }, {
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

//Vendor Related Image uplaod
function uploadImage(file, name) {
    return new Promise(function (resolve, reject) {
        console.log(file.name);
        //Get image extension
        var ext = getExtension(file.name);

        // The name of the input field (i.e. "image") is used to retrieve the uploaded file
        let sampleFile = file;

        var file_name = `${name}-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

        // Use the mv() method to place the file somewhere on your server
        sampleFile.mv(`${SERVERIMAGEUPLOADPATH}offer/${file_name}`, function (err) {
            if (err) {
                console.log('err', err);
                return reject('error');
            } else {
                return resolve(file_name);
            }
        });
    });
}

function getExtension(filename) {
    return filename.substring(filename.indexOf('.') + 1);
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

