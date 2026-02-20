const mongoose = require('mongoose');

const customerProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Ensures a 1-to-1 relationship
    },
    age: Number,
    gender: { type: String, enum: ['Male', 'Female'] },
    height: Number, // in cm
    currentWeight: Number, // in kg
    targetWeight: Number,
    allergies: [String]
    }, { timestamps: true });

module.exports = mongoose.model('Customers', customerProfileSchema);