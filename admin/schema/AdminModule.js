var mongoose = require('mongoose');

var adminModuleSchema = new mongoose.Schema({
    moduleName: { type: String, required: true },
    moduleSlug: { type: String, required: true, unique:true }
}, {
    timestamps: true
});


module.exports = mongoose.model('AdminModule', adminModuleSchema);