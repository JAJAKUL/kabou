var mongoose = require('mongoose');

var orderRefundSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    totalAmount: {type: Number},
    paymentReference: {type: String},
    paymentTime: {type: Date}
}, {
    timestamps: true
});

module.exports = mongoose.model('OrderRefund', orderRefundSchema);