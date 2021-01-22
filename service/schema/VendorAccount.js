var mongoose = require('mongoose');

var vendorAccountSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    accountNo: { type: String, required: true },
    bankCode: { type: String, required: true },
    businessName: { type: String, required: true },
    accountName: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    isCurrent: { type: Boolean, default: true },
}, {
    timestamps: true
});

module.exports = mongoose.model('vendorAccount', vendorAccountSchema);