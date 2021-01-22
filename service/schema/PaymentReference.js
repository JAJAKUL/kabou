var mongoose = require('mongoose');

var paymentReferenceSchema = new mongoose.Schema({
    paidUserId: { type: String},
    paidBy: { type: String, enum: ['CUSTOMER','ADMIN'], default: 'CUSTOMER' },
    amount: {type: Number},
    reference: {type: String, required: true },
    paymentStatus: { type: String, enum: ['PENDING','COMPLETE'], default: 'PENDING' },
}, {
    timestamps: true
});

module.exports = mongoose.model('PaymentReference', paymentReferenceSchema);