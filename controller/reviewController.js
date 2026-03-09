const asyncHandler = require('express-async-handler')
const Review = require('../model/Review')
const Nutritionist = require('../model/Nutritionist')
const Appointment = require('../model/Appointment')
const Diet = require('../model/DietPlan')

const addReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body
    const nutritionistId = req.params.nutritionistId
    const customerId = req.user.id

    const nutritionist = await Nutritionist.findById(nutritionistId) 

    if(!nutritionist) {
        res.status(404)
        throw new Error('Nutritionist not found')
    }

    const completedAppointment = await Diet.findOne({
        nutritionistId,
        customerId,
        status: 'completed'
    })

    if(!completedAppointment) {
        res.status(400)
        throw new Error('You can only review a nutritionist after a completed session.')
    }

    const review = await Review.create({
        nutritionistId,
        customerId,
        rating,
        comment
    })

    const stats = await Review.aggregate([
        {
            $match: { nutritionistId: nutritionist._id }
        },
        {
            $group: {
                _id: '$nutritionistId',
                nRating: { $sum: 1},
                avgRating: { $avg: '$rating'}
            }
        }
    ])

    if(stats.length > 0) {
        await Nutritionist.findByIdAndUpdate(nutritionistId, {
            rating: stats[0].avgRating.toFixed(1),
            reviewCount: stats[0].nRating
    })}
    else {
        await Nutritionist.findByIdAndUpdate( nutritionistId, {
            rating: 0,
            reviewCount: 0
        })
    }

    res.status(201).json({
        success: true,
        data: review,
        message: "Review added successfully"
    })
})

const getReviews = asyncHandler(async (req, res) => {
    const nutritionistId = req.params.nutritionistId

    const reviews = await Review.find({ nutritionistId })
    .populate({
        path: 'customerId',
        select: 'username profilePic'
    })
    .sort({ createdAt: -1})

    res.json({
        success: true,
        count: reviews.length,
        data: reviews
    })
})


module.exports = {
    addReview,
    getReviews
}