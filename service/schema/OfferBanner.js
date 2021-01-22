var mongoose = require('mongoose');

var offerBannerSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.Mixed },
    promoCodeId: { type: String, default:''},
    bannerType: { type: String},
    image: { type: String, required: true },
    fromDate: {type: Date},
    toDate: {type: Date},
    offerText: { type: String, default: ''},
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    sortOrder: {type: Number, default: 0}
}, {
    timestamps: true
});

module.exports = mongoose.model('OfferBanner', offerBannerSchema);