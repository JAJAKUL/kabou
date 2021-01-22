var mongoose = require('mongoose');

var deliveryBoyOrderSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    deliveryBoyId: {type: String, required: true  },
    vendorId: {type: String, required: true },
    deliveryStatus: { type: String, enum: ['NEW','ACCEPTED','REJECTED','COLLECTED','DELIVERED'], default: 'NEW'},
    lattitude: {type: String},
    longitude: {type: String},
}, {
    timestamps: true
});

module.exports = mongoose.model('DeliveryBoyOrder', deliveryBoyOrderSchema);