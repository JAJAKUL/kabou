var nodeMailer = require('nodemailer');
var nodeMailerSmtpTransport = require('nodemailer-smtp-transport');
var config = require('../config');
var handlebars = require('handlebars');
var fs = require('fs');
var path = require('path');

module.exports = function (emailType) {
    const emailFrom = config.emailConfig.MAIL_USERNAME;
    const emailPass = config.emailConfig.MAIL_PASS;
    const emailHost = config.emailConfig.MAIL_HOST;
    const emailPort = config.emailConfig.MAIL_PORT;

    // define mail types
    var mailDict = {
        "userRegistrationMail": {
            subject: "Welcome to Kabou",
            html    : '../modules/emails/userRegistrationMail.html',
            //html    : require('./welcomeUser'),
        },
        "vendorRegistrationMail": {
            subject: "Welcome to Kabou",
            html    : '../modules/emails/vendorRegistrationMail.html',
            //html    : require('./welcomeUser'),
        },
        "vendorOwnerRegistrationMail": {
            subject: "Welcome to Kabou",
            html    : '../modules/emails/vendorOwnerRegistrationMail.html',
            //html    : require('./welcomeUser'),
        },
        "forgotPasswordMail": {
            subject: "Forgot Password",
            html    : '../modules/emails/forgotPasswordMail.html',
            //html    : require('./forgotPasswordMail'),
        },
        "forgotEmailMail": {
            subject: "Forgot Email",
            html    : '../modules/emails/forgotPasswordMail.html',
            //html    : require('./forgotPasswordMail'),
        },
        "verifyUserlMail": {
            subject: "Verify User",
            html    : '../modules/emails/forgotPasswordMail.html',
            //html    : require('./forgotPasswordMail'),
        },
        "forgotPasswordAdminMail": {
            subject: "Forgot Password",
            //html    : require('./forgotPasswordMail'),
        },
        "sendOTPdMail": {
            subject: "OTP verification email",
            html    : '../modules/emails/verifyOtpEmail.html',
            //html    : require('./otpVerificationMail'),
        },
        "resendOtpMail": {
            subject: "Resend OTP",
            html    : '../modules/emails/verifyOtpEmail.html',
        }
    };

    const filePath = path.join(__dirname, mailDict[emailType].html);
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);


    var transporter = nodeMailer.createTransport(nodeMailerSmtpTransport({
        host: emailHost,
        port: emailPort,
        secure: true,
        debug: true,
        auth: {
            user: emailFrom,
            pass    : emailPass,
            // pass: new Buffer(emailPass, 'base64').toString('ascii'),
        },
        maxMessages: 100,
        requireTLS: true,
    }));


    return function (to, data) {
        var self = {
            send: () => {
                var mailOption = {
                    from: `Kabou <${emailFrom}>`,
                    to: to,
                    subject: mailDict[emailType].subject,
                };

                data.imageUrl = `${config.serverhost}:${config.port}/img/email/`

                var emailTemp = config.emailTemplete;
                let mergedObj = {...data, ...emailTemp};
                mailOption.html = template(mergedObj);


                transporter.sendMail(mailOption, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email Sent', info.response);
                    }
                });
            }
        }
        return self;
    }
}

