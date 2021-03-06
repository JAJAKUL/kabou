var mongoose = require('mongoose');

var orderReviewSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    vendorId: { type: String },
    customerId: { type: String },
    customerName: { type: String },
    comment: { type: Object },
    customerRating: { type: String },
}, {
    timestamps: true
});


module.exports = mongoose.model('orderReview', orderReviewSchema);