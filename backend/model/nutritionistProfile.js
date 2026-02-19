const mongoose = require('mongoose')

const nutritionistProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true,
        unique: true
    },
    specialization: {
        type: String,
        required: [true, "Please provide your area of expertise"],
        enum: ['Weight Loss', 'Muscle Building', 'Diabetic Diet', 'Sports Nutrition','General Health']
    },
    bio: {
        type: String,
        maxlength: [500, "Bio cannot exceed 500 characters"]
    },
    yearsOfExperience: {
        type: Number,
        default: 0
    },
    clientServed: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

module.exports = mongoose.model('NutritionistProfile', nutritionistProfileSchema )
