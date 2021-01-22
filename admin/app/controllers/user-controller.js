const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const mail = require('../../modules/sendEmail');
//Session
var session = require('express-session');

var adminUserSchema = require('../../schema/Admin');

/**
 * @developer : Subhajit Singha
 * @date : 1st February 2020
 * @description : Function for login page.
 */

module.exports.login = (req, res) => {
    res.render('user/login');
}


module.exports.forgotPassword = (req, res) => {
    res.render('user/forgotPassword');
}

/**
 * @developer : Subhajit Singha
 * @date : 23rd March 2020
 * @description : Function for login check
 */

module.exports.loginPost = (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('msgLog', errors.array()[0].msg);
        req.flash('msgType', 'danger');
        res.redirect('/user/login');
        return;
    } else {

        var email = req.body.email;
        var password = req.body.password;
        adminUserSchema.findOne({
            email: email,
            status: 'ACTIVE'
        })
            .collation({ locale: 'en', strength: 2 })
            .then(function (loginres) {
                if (loginres != null) {

                    const comparePass = bcrypt.compareSync(password, loginres.password);
                    if (comparePass) { //PASSWORD MATCH

                        req.session.user = loginres;

                        console.log('user', req.session.user);

                        req.flash('msgLog', 'Loggedin successfully.');
                        req.flash('msgType', 'success');
                        res.redirect('/dashboard');



                    } else { //PASSWORD MISMATCH
                        console.log('Password mismatch');

                        req.flash('msgLog', 'Email or password is incorrect.');
                        req.flash('msgType', 'danger');
                        res.redirect('/user/login');
                        return;
                    }

                } else { //USERNAME MISMATCH
                    console.log('Username mismatch');

                    req.flash('msgLog', 'Username or password is incorrect.');
                    req.flash('msgType', 'danger');
                    res.redirect('/user/login');
                    return;
                }
            })
            .catch(function (err) {
                console.log(err);

                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect('/user/login');
                return;
            })
    }
}

module.exports.forgotPasswordPost = (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('msgLog', errors.array()[0].msg);
        req.flash('msgType', 'danger');
        res.redirect('/user/forgotPassword');
        return;
    } else {
        // console.log(req.body.email);
        // return;
        var email = req.body.email;

        adminUserSchema.findOne({
            email: email
        })
            .then(function (userCheck) {
                if (userCheck != null) {

                    var newPassword = generateP();


                    bcrypt.hash(newPassword, 8, function (err, hash) {
                        if (err) {
                            req.flash('msgLog', 'Something went wrong.');
                            req.flash('msgType', 'danger');
                            res.redirect('/user/forgotPassword');
                            return;
                        } else {
                            adminUserSchema.updateOne({ _id: userCheck._id }, {
                                $set: {
                                    password: hash
                                }
                            }, function (err, resp) {
                                if (err) {
                                    req.flash('msgLog', 'Something went wrong.');
                                    req.flash('msgType', 'danger');
                                    res.redirect('/user/forgotPassword');
                                    return;
                                } else {

                                    var userData = {
                                        password: newPassword,
                                    }

                                    console.log(userData);
                                    var userEmail = userCheck.email;

                                    try {
                                        mail('forgotPasswordEmail')(userEmail, userData).send();

                                        req.flash('msgLog', 'Please check your email. We have sent a password to be used.');
                                        req.flash('msgType', 'success');
                                        res.redirect('/user/login');
                                        return;
                                    } catch (Error) {
                                        console.log('Something went wrong while sending email');

                                        req.flash('msgLog', 'Something went wrong.');
                                        req.flash('msgType', 'danger');
                                        res.redirect('/user/forgotPassword');
                                        return;
                                    }

                                }
                            })
                        }
                    })






                } else { //EMAIL MISMATCH
                    console.log('email mismatch');

                    req.flash('msgLog', 'Incorrect email.');
                    req.flash('msgType', 'danger');
                    res.redirect('/user/forgotPassword');
                    return;
                }
            })
            .catch(function (err) {
                console.log(err);

                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect('/user/login');
                return;
            })
    }

}

module.exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/user/login');
}

module.exports.editProfile = (req, res) => {
    var user = req.session.user;
    var responseObj = {};
    var adminType = ''
    var adminId = req.session.user._id;

    adminUserSchema.findOne({ _id: adminId })
        .then((admin) => {
            if (admin.admintype == 'SUB_ADMIN') {
                adminType = 'disabled';
            }

            res.render('user/editProfile.ejs', {
                responseObj: admin, layout: false,
                user: user,
                adminType: adminType
            });
        })
        .catch(function (err) {
            console.log(err);

            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect('dashboard');
            return;
        })
}

module.exports.editProfilePost = (req, res) => {


       

        var reqBody = req.body;

        var adminId = reqBody.adminId;

        delete reqBody.adminId;

        // console.log(reqBody);

        // return;

        adminUserSchema.updateOne({ _id: adminId }, {
            $set: reqBody
        }, function (err, resp) {
            if (err) {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect('/user/editProfile');
                return;
            } else {

                if (resp.nModified == 1) {
                    req.flash('msgLog', 'Profile updated successfully.');
                    req.flash('msgType', 'success');
                    res.redirect('/user/editProfile');
                    return;
                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect('/user/editProfile');
                    return;
                }
            }
        })
    

}

module.exports.changePassword = (req, res) => {
    var user = req.session.user;
    var responseObj = {};
    var adminId = req.session.user._id;

    adminUserSchema.findOne({ _id: adminId })
        .then((admin) => {
            console.log(admin);

            res.render('user/changePassword.ejs', {
                responseObj: admin, layout: false,
                user: user
            });
        })
        .catch(function (err) {
            console.log(err);

            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect('dashboard');
            return;
        })
}

module.exports.changePasswordPost = (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('msgLog', errors.array()[0].msg);
        req.flash('msgType', 'danger');
        res.redirect('/user/forgotPassword');
        return;
    } else {


        var adminId = req.body.adminId;

        var oldPassword = req.body.oldPassword;
        var newPassword = req.body.newPassword;

        adminUserSchema.findOne({ _id: adminId }, function (err, result) {
            if (err) {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect('/user/changePassword');
                return;
            } else {
                if (result) {
                    const comparePass = bcrypt.compareSync(oldPassword, result.password);
                    if (comparePass) {

                        bcrypt.hash(newPassword, 8, function (err, hash) {
                            if (err) {
                                req.flash('msgLog', 'Something went wrong.');
                                req.flash('msgType', 'danger');
                                res.redirect('/user/changePassword');
                                return;
                            } else {
                                adminUserSchema.updateOne({ _id: adminId }, {
                                    $set: {
                                        password: hash
                                    }
                                }, function (err, resp) {
                                    if (err) {
                                        req.flash('msgLog', 'Something went wrong.');
                                        req.flash('msgType', 'danger');
                                        res.redirect('/user/changePassword');
                                        return;
                                    } else {
                                        req.flash('msgLog', 'Password changed successfully.');
                                        req.flash('msgType', 'success');
                                        res.redirect('/user/changePassword');
                                        return;
                                    }
                                })
                            }
                        })
                    } else {
                        req.flash('msgLog', 'Invalid old password');
                        req.flash('msgType', 'danger');
                        res.redirect('/user/changePassword');
                        return;

                    }
                } else {
                    req.flash('msgLog', 'User not found');
                    req.flash('msgType', 'danger');
                    res.redirect('/user/changePassword');
                    return;
                }
            }
        });
    }

}


function generateP() {
    var pass = '';
    var str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
        'abcdefghijklmnopqrstuvwxyz0123456789@#_';

    for (i = 1; i <= 20; i++) {
        var char = Math.floor(Math.random()
            * str.length + 1);

        pass += str.charAt(char)
    }

    return pass;
} 