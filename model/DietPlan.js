const mongoose = require('mongoose')

const mealSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
        required: [true, 'Meal type is required']
    },
    name: {
        type: String,
        required: [true, 'Meal name is required']
    },
    description: {
        type: String,
        required: [true, 'Meal description/ingredients are required']
    },
    calories: {
        type: Number,
        required: [true, 'Calories are required']
    },
    isCompleted: {
        type: Boolean,
        default: false
    }
});

const dietSchema = new mongoose.Schema({
    nutritionistId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in progress', 'completed', 'expired'],
        default: 'pending'
    },
    progress: {
        type: Number,
        default: 0
    },
    meals: [mealSchema]
}, { timestamps: true });

module.exports = mongoose.model('Diet', dietSchema)