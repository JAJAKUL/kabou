var mongoose = require('mongoose');

var promoCodeSchema = new mongoose.Schema({
    vendorId: { type: Array },
    vendorType: { type: String, enum: ['ALL', 'SPECIFIC'] },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'] },
    discountAmount: { type: Number, required: true },
    promoCategory: { type: String, enum: ['SUB_TOTAL', 'DELIVERY_CHARGE', 'TOTAL'] },
    promoCode: { type: String, required: true},
    promoCodeDesciption: { type: String},
    promoCodeAmountMinCap: { type: String},
    promoCodeAmountMaxCap: { type: String},
    totalBudget: { type: String, default:''},
    currentOrderTotal: { type: String, default:''},
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    sortOrder: {type: Number, default: 0},
    usageType: { type: String, enum: ['UNIQUE', 'MULTIPLE'], default: 'MULTIPLE' },
    customerApplied: { type: Array}
}, {
    timestamps: true
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);