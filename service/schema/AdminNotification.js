var mongoose = require('mongoose');

var adminNotificationSchema = new mongoose.Schema({
    notificationTypeId: { type: String},
    notificationType: { type: String, default: 'MENU', enum: ['MENU']},
    title: { type: String  },
    content: { type: String  },
    isRead: { type: String, enum: ['YES', 'NO'], default: 'NO'  }
}, {
    timestamps: true
});

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);