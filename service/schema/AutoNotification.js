var mongoose = require('mongoose');

var AutoNotificationSchema = new mongoose.Schema({
    type: { type: String},
    content: { type: String },
    userType: { type: String, default: 'VENDOR', enum: ['CUSTOMER','VENDOR','DELIVERYBOY']},
}, {
    timestamps: true
});

module.exports = mongoose.model('AutoNotification', AutoNotificationSchema);