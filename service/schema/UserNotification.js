var mongoose = require('mongoose');

var userNotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true},
    orderId: { type: String, default: ''},
    userType: { type: String,required: true , enum: ['CUSTOMER', 'VENDOR', 'DELIVERY BOY','ADMIN','VENDOR ADMIN']},
    title: { type: String  },
    type: { type: String  },
    content: { type: String  },
    automatic: { type: String, enum: ['YES', 'NO'], default: 'YES'  },
    isRead: { type: String, enum: ['YES', 'NO']  }
}, {
    timestamps: true
});

module.exports = mongoose.model('UserNotification', userNotificationSchema);