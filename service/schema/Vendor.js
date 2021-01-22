var mongoose = require('mongoose');

var vendorSchema = new mongoose.Schema({
    restaurantName: { type: String, required: true },
    description: { type: String},
    managerName: { type: String},
    restaurantType: { type: String},
    contactEmail: { type: String, email: true},
    countryCode: { type: String, required: true },
    contactPhone: { type: Number},
    logo: { type: String },
    banner: { type: String},
    rating: { type: Number, default: 0 },
    preOrder: { type: String, enum: ['ON', 'OFF'], default: 'ON' },
    licenceImage: { type: String, default: ''},
    foodSafetyCertificate: { type: String, default: ''},
    address: { type: String, default: ''},
    location: {
        type: {
            type: String,
            enum: ['Point'] 
        },
        coordinates: {
            type: [Number]
        }
    },
    isActive: { type: Boolean, default: false },
    status: { type: String, enum: ['INACTIVE','PENDING_FOR_LICENSE','WAITING_FOR_APPROVAL', 'ACTIVE'], default: 'ACTIVE'},
    restaurantClose: { type: Boolean, default: false },
    vendorOpenCloseTime: [{ type: mongoose.Schema.Types.ObjectId, ref: 'vendorOpenCloseTime' }],
    popularity: { type: Number, default: 0 },
    isDisabled: { type: Boolean, default: false },
    delivery: { type: Boolean, default: true },
    lastModified: {type: Date, default: new Date()},
    activationFromDate: {type: Date, default: new Date()},
    activationToDate: {type: Date, default: new Date()},
    activationNote: { type: String, default: ''},
}, {
    timestamps: true
});

vendorSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('Vendor', vendorSchema);