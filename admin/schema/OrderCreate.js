var mongoose = require('mongoose');

var orderCreateSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderTrackingId: {type: String, required: true },
    orderFare: {type: String},
    orderDistance: {type: String},
    orderTime: {type: String},
    orderCreateStatus: { type: String, enum: ['YES','NO'], default: 'NO' },
}, {
    timestamps: true
});

module.exports = mongoose.model('OrderCreate', orderCreateSchema);