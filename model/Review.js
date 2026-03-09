const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
    nutritionistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Nutritionist',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: [true ,'Please add a rating between 1 and 5'],
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: [true, 'Please add a comment'],
        maxlength: [500, 'Comment cannot exceed 500 characters'],
        trim: true
    }
}, { timestamps: true});

reviewSchema.index({ nutritionistId: 1, customerId: 1 }, { unique: true })

module.exports = mongoose.model('Review', reviewSchema)