var mongoose = require('mongoose');

var adminSettingSchema = new mongoose.Schema({
    availabilityRadiusHome: { type: Number, required: true, default: 7000 },
    availabilityRadiusFavourite: { type: Number, required: true, default: 7000},
    type: { type: Number, required: true, default: 1}
}, {
    timestamps: true
});


module.exports = mongoose.model('AdminSetting', adminSettingSchema);