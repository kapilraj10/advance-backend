const mongoose = require('mongoose');

const UsageSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    description: { type: String }
}, { _id: false });

const AdvanceSchema = new mongoose.Schema({
    advance_id: { type: String, index: true, unique: true, default: () => new mongoose.Types.ObjectId().toString() },
    title: { type: String, required: true },
    description: { type: String },
    staffName: { type: String, required: true },
    staffEmail: { type: String, required: true },
    staffPhone: { type: String },
    amount: { type: Number, required: true },
    startDate: { type: Date, required: true },
    type: { type: String },
    paymentMode: { type: String },
    remarks: { type: String },
    usages: { type: [UsageSchema], default: [] },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Advance', AdvanceSchema);
