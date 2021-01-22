var mongoose = require('mongoose');

var ContentSchema = new mongoose.Schema({
    pageName: { type: String, default: '',  required: true},
    content: { type: mongoose.Schema.Types.Mixed },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Content', ContentSchema);