var mongoose = require('mongoose');

var vendorPaymentSettingSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    paymentPercentage: { type: String, required: true },
    sendPaymentEmail: { type: String, required: true, enum: ['INACTIVE','ACTIVE'], default: 'ACTIVE' },
}, {
    timestamps: true
});

module.exports = mongoose.model('VendorPaymentSetting', vendorPaymentSettingSchema);