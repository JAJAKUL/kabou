var mongoose = require('mongoose');

var paymentSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    totalAmount: {type: Number, required: true },
    customerPaymentReference: {type: String, required: true },
    customerPaymentAuthorizationCode: {type: String, required: true },
    customePaymentSignature: {type: String},
    customerPaymentCustomerCode: {type: String},
    customerPaymentTime: {type: Date},
    customerPaymentDetails: {type: mongoose.Schema.Types.Mixed, default: '' },
    vendorAmount: {type: Number, required: true },
    vendorPaymentReference: {type: String},
    vendorPaymentTransferCode: {type: String},
    vendorPaymentStatus: { type: String, enum: ['INITIATE','PENDING','COMPLETE'], default: 'INITIATE' },
    vendorPaymentTime: {type: Date},

}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);