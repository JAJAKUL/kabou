var settingsSchema = require('../schema/Setting');

exports.checksettings = async (req, res, next) => {
    if (req.session.settings == undefined) {
        settingsSchema.findOne()
            .then(function (resp) {

                req.session.settings = resp.data;
                next();
            })
    } else {
        next();
    }


}