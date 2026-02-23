const mongoose = require('mongoose')

const nutritionistProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true,
        unique: true
    },
    specialization: {
        type: [String],
        required: [true, "Please provide your area of expertise"],
        enum: ['Weight Loss', 'Muscle Building', 'Diabetic Diet', 'Sports Nutrition','General Health']
    },
    bio: {
        type: String,
        maxlength: [500, "Bio cannot exceed 500 characters"]
    },
    cardBio: {
        type: String,
        maxlength: [150, 'Cannot exceed 150 characters']
    },  
    yearsOfExperience: {
        type: Number,
        default: 0
    },
    clientServed: {
        type: Number,
        default: 0
    },
    rating: {
        type:Number,
        default:0,
        min:0,
        max:5
    },
    reviewCount: {
        type:Number,
        default:0
    },
    languages: {
        type:[String],
        enum: {
            values:['Arabic', 'English', 'Portuguese', 'Spanish', 'Russian'],
            message: '{VALUE} is not a supported language'}
    },
    price: {
        type: Number,
        min: [0, 'Price cannot be negative'],
        max: [500, 'Price cannot exceed 500 dollars per hour']
    }
}, { timestamps: true });

module.exports = mongoose.model('Nutritionists', nutritionistProfileSchema )
