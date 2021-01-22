const { SERVERURL, HOST, PORT, SERVERIMAGEPATH, SERVERIMAGEUPLOADPATH } = require('../../config/bootstrap');
//Session
var session = require('express-session');

var contentSchema = require('../../schema/Content');
var faqSchema = require('../../schema/Faq');
var autoNotificationSchema = require('../../schema/AutoNotification');


module.exports.contentEdit = async (req, res) => {

    var user = req.session.user;

    var contentId = req.query.id;
    var responseDt = {};

    if (contentId != undefined) {


        contentSchema
            .findOne({ _id: contentId })
            .then(async function (content) {

                // console.log(content);
                // return;

                // for(let cntnt of content.content) {

                //     var faqObj = {
                //         question: cntnt.question,
                //         answer: cntnt.answer[0]
                //     }

                //     new faqSchema(faqObj).save(function (err, admin) {
                //         if (err) {
                //             console.log('err', err);

                //         } else {
                //             console.log(admin);
                //         }

                //     });
                // }

                if (content != null) {


                    var imagePath = `${SERVERIMAGEPATH}category/`

                    res.render('content/contentEdit.ejs', {
                        content: content, contentId: contentId,
                        layout: false,
                        user: user,
                        serverImagePath: imagePath,
                        pageName: content.pageName
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
module.exports.contentEditPost = async (req, res) => {

    var reqBody = req.body;

    var contentId = reqBody.contentId;

    var content = reqBody.content;

    // return;

    contentSchema.updateOne({ _id: contentId }, {
        $set: { content: content }
    }, async function (err, result) {
        if (err) {
            console.log(err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        } else {
            req.flash('msgLog', 'Content updated successfully.');
            req.flash('msgType', 'success');
            res.redirect('/content/contentList');
            return;
        }
    });


}



module.exports.contentList = (req, res) => {

    var user = req.session.user;

    contentSchema.find({ isActive: true }, { pageName: 1, isActive: 1 })
        .then(async (contents) => {

            var imagePath = `${SERVERIMAGEPATH}category/`

            res.render('content/contentList.ejs', {
                contents: contents,
                layout: false,
                user: user,
                serverImagePath: imagePath
            });
        });
}

module.exports.faqList = (req, res) => {

    var user = req.session.user;

    var reqQueryStatus = req.query.userType;
    var userType = 'CUSTOMER'

    var reqCondObj = {};
    if (reqQueryStatus == 'VENDOR') {
        reqCondObj.userType = 'VENDOR'
        userType = 'VENDOR';
    } else {
        reqCondObj.userType = 'CUSTOMER'
    }

    faqSchema.find(reqCondObj)
        .then(async (faqs) => {

            res.render('content/faqList.ejs', {
                faqs: faqs,
                layout: false,
                user: user,
                userType: userType
            });
        });
}

module.exports.faqEdit = async (req, res) => {

    var user = req.session.user;

    var faqId = req.query.id;
    var responseDt = {};

    if (faqId != undefined) {


        faqSchema
            .findOne({ _id: faqId })
            .then(async function (faq) {

                if (faq != null) {

                    // console.log('faq',faq);

                    // return;

                    res.render('content/faqEdit.ejs', {
                        faq: faq,
                        faqId: faqId,
                        layout: false,
                        user: user
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

module.exports.faqEditPost = async (req, res) => {

    var reqBody = req.body;

    // console.log('reqBody', reqBody);

    // return;


    var faqId = reqBody.faqId;

    var question = reqBody.question;
    var answer = reqBody.answer;
    var userType = reqBody.userType;

    // return;

    faqSchema.updateOne({ _id: faqId }, {
        $set: { question: question, answer: answer, userType: userType }
    }, async function (err, result) {
        if (err) {
            console.log(err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        } else {
            req.flash('msgLog', 'FAQ updated successfully.');
            req.flash('msgType', 'success');
            res.redirect('/content/faqList');
            return;
        }
    });


}

module.exports.faqAdd = async (req, res) => {

    var user = req.session.user;

    var responseDt = {};

    res.render('content/faqAdd.ejs', {
        layout: false,
        user: user
    });


}

module.exports.faqAddPost = async (req, res) => {

    var reqBody = req.body;


    var faqObj = {
        question: reqBody.question,
        answer: reqBody.answer,
        userType: reqBody.userType
    }

    new faqSchema(faqObj).save(function (err, admin) {
        if (err) {
            console.log(err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;

        } else {
            req.flash('msgLog', 'FAQ added successfully.');
            req.flash('msgType', 'success');
            res.redirect('/content/faqList');
            return;
        }

    });


}

module.exports.deleteFaq = async (req, res) => {

    var user = req.session.user;

    var faqId = req.query.id;
    var responseDt = {};

    if (faqId != undefined) {


        faqSchema
            .findOne({ _id: faqId })
            .then(async function (faq) {

                if (faq != null) {

                    faqSchema.deleteOne({ _id: faqId }, function (err) {
                        if (err) {
                            req.flash('msgLog', 'Something went wrong.');
                            req.flash('msgType', 'danger');
                            res.redirect(req.headers.referer);
                            return;
                        } else {
                            req.flash('msgLog', 'Faq deleted successfully.');
                            req.flash('msgType', 'success');
                            res.redirect(req.headers.referer);
                            return;

                        }
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

module.exports.autoNotificationList = (req, res) => {

    var user = req.session.user;


    // var faqObj = {
    //     type: 'Collected order',
    //     content: 'Your order has been collected',
    //     userType: 'CUSTOMER'
    // }

    // new autoNotificationSchema(faqObj).save(function (err, admin) {
    //     if (err) {
    //         console.log('err', err);

    //     } else {
    //         console.log(admin);
    //     }

    // });


    autoNotificationSchema.find({})
        .then(async (faqs) => {

            res.render('content/autoNotificationList.ejs', {
                faqs: faqs,
                layout: false,
                user: user
            });
        });
}

module.exports.autoNotificationEdit = async (req, res) => {

    var user = req.session.user;

    var faqId = req.query.id;
    var responseDt = {};

    if (faqId != undefined) {


        autoNotificationSchema
            .findOne({ _id: faqId })
            .then(async function (faq) {

                if (faq != null) {

                    // console.log('faq',faq);

                    // return;

                    res.render('content/autoNotificationEdit.ejs', {
                        faq: faq,
                        faqId: faqId,
                        layout: false,
                        user: user
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

module.exports.autoNotificationEditPost = async (req, res) => {

    var reqBody = req.body;

    // console.log('reqBody', reqBody);

    // return;


    var faqId = reqBody.faqId;

    var content = reqBody.content;

    // return;

    autoNotificationSchema.updateOne({ _id: faqId }, {
        $set: { content: content }
    }, async function (err, result) {
        if (err) {
            console.log(err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        } else {
            req.flash('msgLog', 'Notification content updated successfully.');
            req.flash('msgType', 'success');
            res.redirect('/content/autoNotificationList');
            return;
        }
    });


}



