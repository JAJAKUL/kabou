const { ENVIRONMENT } = require('../config/bootstrap');
var adminSchema = require('../schema/Admin')

exports.beforeLogin = async (req, res, next) => {

    if (req.session.user) {

        if (ENVIRONMENT == 'development') {
            next();
        } else {
            console.log('dashboard');
            res.redirect('/dashboard');
        }
    } else {
        next();
    }

}


exports.afterLogin = async (req, res, next) => {
    if (req.session.user) {
        var adminId = req.session.user._id;

        adminSchema.findOne({_id: adminId})
            .then(function (resp) {

                if(resp != null) {
                    next();
                } else {
                    req.session.destroy();
                    res.redirect('/user/login');
                }
                
            })
    } else {
        if (ENVIRONMENT == 'development') {
            next();
        } else {
            console.log('no_user');
            res.redirect('/user/login');
        }

    }
}

exports.accessControl = async (req, res, next) => {
    var reqUrl = req.originalUrl;


    if (ENVIRONMENT == 'development') {
        next();
    } else {
        var userSess = req.session.user;

        var adminId = userSess._id;

        var user = await adminSchema.findOne({_id: adminId});

        if (user.admintype == 'SUPER_ADMIN') {
            next();
        } else {

            var editUrlTypes = ['add', 'edit', 'update', 'change', 'status', 'Add', 'Edit', 'Update', 'Change', 'Status', 'delete', 'Delete', 'remove', 'Remove'];

            var totalEditLeng = editUrlTypes.length;

            //  console.log(user);
            var reqUrl = req.originalUrl;

            var reqUrlZs = reqUrl.split("?");

            var reqUrlZ = reqUrlZs[0];
            //   console.log(reqUrl);

            var manageAbleModuleArr = user.manageableModuleFullAccess;

            if (manageAbleModuleArr.length > 0) {
                var chckValid = 0;
                for (let manageAbleModule of manageAbleModuleArr) {
                    var manageMod = manageAbleModule;

                    var manageModArr = manageMod.split(",");

                    for (let manageMods of manageModArr) {


                        if (reqUrlZ.search(manageMods) >= 0) {

                            chckValid = 1
                        }
                    }
                }
            }

            if (chckValid == 1) {
                next();
            } else {

                var manageAbleModuleViewArr = user.manageableModuleViewOnly;
                var chckValidView = 0;

                if (manageAbleModuleViewArr.length > 0) {
                    for (let manageAbleModuleView of manageAbleModuleViewArr) {

                        var manageAbleModuleViewArr = manageAbleModuleView.split(",");

                        for(let manageMods of manageAbleModuleViewArr) {
                        if (reqUrlZ.search(manageMods) >= 0) {

                            for (let editUrlType of editUrlTypes) {
                                if (reqUrlZ.search(editUrlType) < 0) {
                                    chckValidView++;
                                }
                            }



                        }
                    }
                    }
                }
                if (chckValidView == totalEditLeng) {
                    // console.log('access',reqUrl);
                    // return;
                    next();
                } else {
                    console.log('No access', reqUrl);
                    res.redirect('/noAccess');
                }


            }

        }
    }


}