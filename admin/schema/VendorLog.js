var mongoose = require('mongoose');

var vendorlogSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, required: true },
    log: { type: String, required: true },
    addedTime: {type:Date, default: new Date()},
}, {
    timestamps: true
});


module.exports = mongoose.model('VendorLog', vendorlogSchema);