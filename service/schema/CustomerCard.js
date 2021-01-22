var mongoose = require('mongoose');

var customerCardSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true},
    authorizationCode: { type: String, required: true},
    signature: { type: String, required: true},
    authorization: { type: Object },
    email: {type: String, default: '', required: true}
}, {
    timestamps: true
});


module.exports = mongoose.model('CustomerCard', customerCardSchema);