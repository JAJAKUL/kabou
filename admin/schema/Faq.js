var mongoose = require('mongoose');

var FaqSchema = new mongoose.Schema({
    question: { type: String, default: '',  required: true},
    answer: { type: Array },
    userType: { type: String, default: 'VENDOR', enum: ['CUSTOMER','VENDOR','DELIVERYBOY']},
}, {
    timestamps: true
});

module.exports = mongoose.model('Faq', FaqSchema);