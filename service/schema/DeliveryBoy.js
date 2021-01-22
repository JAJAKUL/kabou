var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var deliveryboySchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, unique: true },
    phone: { type: Number, unique: true  },
    countryCode: { type: String, required: true },
    password: { type: String, required: true },
    vehicleType: { type: String },
    numberPlateImage: { type: String, default: ''},
    licenceImage: { type: String, default: ''},
    profileImage: { type: String, default: ''},
    verifyOtp: { type: String, default: '' },
    otpTime: { type: Date },
    status: { type: String, enum: ['INACTIVE','PENDING', 'ACTIVE'], default: 'INACTIVE'},
    badgeCount: { type: Number, default: 0 },
    availability: { type: Boolean, default: false}
}, {
    timestamps: true
});

deliveryboySchema.pre('save', function(next) {
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

module.exports = mongoose.model('DeliveryBoy', deliveryboySchema);