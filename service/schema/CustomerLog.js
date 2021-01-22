var mongoose = require('mongoose');

var customerlogSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, required: true },
    log: { type: String, required: true },
    addedTime: {type:Date, default: new Date()},
}, {
    timestamps: true
});


module.exports = mongoose.model('CustomerLog', customerlogSchema);