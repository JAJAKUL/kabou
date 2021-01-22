var nodeMailer = require('nodemailer');
var nodeMailerSmtpTransport = require('nodemailer-smtp-transport');
const { MAIL_USERNAME, MAIL_PASS, MAIL_HOST, MAIL_PORT, HOST, PORT, APP_URL } = require('../config/bootstrap');
var handlebars = require('handlebars');
var fs = require('fs');
var path = require('path');

module.exports = function (emailType) {
    const emailFrom = MAIL_USERNAME;
    const emailPass = MAIL_PASS;
    const emailHost = MAIL_HOST;
    const emailPort = MAIL_PORT;

    // define mail types
    var mailDict = {
        "forgotPasswordEmail": {
            subject: "Forgot Password",
            html    : '../modules/emails/forgotPasswordEmail.html',
        },
        "SubadminAdd": {
            subject: "Welcome to Kabou",
            html    : '../modules/emails/SubadminAdd.html',
        },
        "paymentReceipt": {
            subject: "Order Confirmation",
            html    : '../modules/emails/paymentReceipt.html',
        },
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
            pass: emailPass,
        },
        maxMessages: 100,
        requireTLS: true,
    }));


    return function (to, data) {
        var self = {
            send: () => {
                var mailOption = {
                    from: ` Kabou <${emailFrom}>`,
                    to: to,
                    subject: mailDict[emailType].subject,
                    // text: `Hello ${data.name}, please verify your studiolive account. Your verification code is ${data.otp}`
                };

                data.imageUrl = `${HOST}:${PORT}/img/`

                var emailTemp = {
                    appUrl: APP_URL
                };
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

