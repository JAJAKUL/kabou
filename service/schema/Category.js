var mongoose = require('mongoose');

var categorySchema = new mongoose.Schema({
    categoryName: { type: String, required: true },
    image: { type: String},
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    sortOrder: {type: Number, default: 0},
    categoryType: { type: String, enum: ['FIXED', 'CUSTOM'], default: 'CUSTOM'}
}, {
    timestamps: true 
});

module.exports = mongoose.model('Category', categorySchema);