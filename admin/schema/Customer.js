var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var customerSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String},
    phone: { type: Number},
    socialId: { type: String},
    countryCode: { type: String, required: true },
    password: { type: String },
    cityId: { type: String },
    location: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    promoCode: { type: String, default: '' },
    allowMail: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    status: { type: String, enum: ['INACTIVE', 'ACTIVE'], default: 'ACTIVE'},
    otp: { type: String, default: '' }, 
    verifyOtp: { type: String, default: '' },
    otpTime: { type: Date },
    appType: { type: String, enum: ['IOS', 'ANDROID', 'BROWSER']},
    deviceToken: { type: String, default: '' },
    loginType: { type: String, default: 'GENERAL'},
    userType: { type: String, default: 'customer'},
    badgeCount: { type: Number, default: 0 },
    lastModified: {type: Date, default: new Date()},
}, {
    timestamps: true
});

customerSchema.pre('save', function(next) {
    let customer = this;
    if (!customer.isModified('password')) {
        return next();
    }

    bcrypt.hash(customer.password, 8, function(err, hash) {
        if (err) {
            return next(err);
        } else {
            if (customer.password !== '') {
                customer.password = hash
            }
            next();
        }
    })
});

module.exports = mongoose.model('Customer', customerSchema);