var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var adminSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String},
    phone: { type: Number},
    countryCode: { type: String, required: true },
    password: { type: String },
    profileImage: { type: String, default: '' },
    manageableModuleFullAccess: { type: Array, default: [] },
    manageableModuleViewOnly: { type: Array, default: [] },
    admintype: { type: String, enum: ['SUPER_ADMIN', 'SUB_ADMIN'], default: 'SUPER_ADMIN'},
    status: { type: String, enum: ['INACTIVE', 'ACTIVE'], default: 'ACTIVE'},
}, {
    timestamps: true
});

adminSchema.index({email: 1}, {collation: {locale: "en", strength: 2}});

adminSchema.pre('save', function(next) {
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

module.exports = mongoose.model('Admin', adminSchema);