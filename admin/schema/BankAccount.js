var mongoose = require('mongoose');

var bankAccountSchema = new mongoose.Schema({
    bankName: { type: String, required: true },
    bankCode: { type: String, required: true },
    postObj: { type: Object, required: true },
}, {
    timestamps: true
});

module.exports = mongoose.model('bankAccount', bankAccountSchema);