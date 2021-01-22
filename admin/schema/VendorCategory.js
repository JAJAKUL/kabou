var mongoose = require('mongoose');

var vendorCategorySchema = new mongoose.Schema({
    categoryName: { type: String, required: true },
    image: { type: String},
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    sortOrder: {type: Number, default: 0}
}, {
    timestamps: true
});

module.exports = mongoose.model('VendorCategory', vendorCategorySchema);