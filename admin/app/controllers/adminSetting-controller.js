const { validationResult } = require('express-validator');
const mail = require('../../modules/sendEmail');
const { SERVERURL, HOST, PORT } = require('../../config/bootstrap');
//Session
var session = require('express-session');

var adminSettingSchema = require('../../schema/AdminSetting');



module.exports.settingsEdit = (req, res) => {
    var user = req.session.user;

    adminSettingSchema.findOne({type: 1})
        .sort({ createdAt: -1 })
        .then(async (adminSettings) => {

            if(adminSettings == null) {
                var adminSettings = {
                    availabilityRadiusHome: 7000,
                    availabilityRadiusFavourite: 7000
                }
            }
            

            res.render('adminSetting/settingsEdit.ejs', {
                adminSettings: adminSettings,
                layout: false,
                user: user
            });
        });
}

module.exports.settingsEditPost = (req, res) => {

    var reqBody = req.body;

    adminSettingSchema.updateOne({ type: 1 }, {
        $set: reqBody
    }, function (err, resp) {
        if (err) {
            console.log(err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        } else {
            if (resp.nModified == 1) {
                req.flash('msgLog', 'Settings updated successfully.');
                req.flash('msgType', 'success');
                res.redirect(req.headers.referer);
                return;
            } else {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            }
        }
    });

}



