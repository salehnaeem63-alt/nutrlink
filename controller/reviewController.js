const mongoose = require('mongoose')
const asyncHandler = require('express-async-handler')
const Review = require('../model/Review')
const Nutritionist = require('../model/Nutritionist')
const Appointment = require('../model/Appointment')
const Diet = require('../model/DietPlan')
const Customer = require('../model/Customer') // IMPORTED CUSTOMER MODEL

const addReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body
    const nutritionistId = req.params.nutritionistId
    const authUserId = req.user.id

    const nutritionist = await Nutritionist.findById(nutritionistId)
    if (!nutritionist) {
        res.status(404)
        throw new Error('Nutritionist not found')
    }

    // ARCHITECTURE FIX: 1. Fetch the Customer Profile ID
    const customerProfile = await Customer.findOne({ user: authUserId }).select('_id');
    if (!customerProfile) {
        res.status(404)
        throw new Error('Customer profile not found. Please complete your profile.')
    }
    const customerProfileId = customerProfile._id;

    // ARCHITECTURE FIX: 2. Search Review collection using Profile ID
    const alreadyReviewd = await Review.findOne({
        nutritionistId,
        customerId: customerProfileId
    })
    if (alreadyReviewd) {
        res.status(400)
        throw new Error('You have already reviewed this nutritionist.')
    }

    // ARCHITECTURE FIX: 3. Search Diet collection using Profile ID
    const completedAppointment = await Diet.findOne({
        nutritionistId,
        customerId: customerProfileId,
        status: 'completed'
    })

    if (!completedAppointment) {
        res.status(400)
        throw new Error('You can only review a nutritionist after a completed session.')
    }

    // ARCHITECTURE FIX: 4. Save Profile ID into the Review collection
    const review = await Review.create({
        nutritionistId,
        customerId: customerProfileId,
        rating,
        comment
    })

    const stats = await Review.aggregate([
        {
            $match: { nutritionistId: new mongoose.Types.ObjectId(nutritionistId) }
        },
        {
            $group: {
                _id: '$nutritionistId',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ])

    if (stats.length > 0) {
        await Nutritionist.findByIdAndUpdate(nutritionistId, {
            rating: stats[0].avgRating.toFixed(1),
            reviewCount: stats[0].nRating
        })
    }
    else {
        await Nutritionist.findByIdAndUpdate(nutritionistId, {
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

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const totalReviews = await Review.countDocuments({ nutritionistId })

    const reviews = await Review.find({ nutritionistId })
        // ARCHITECTURE FIX: 5. Nested Populate to get Username/ProfilePic from User collection via Customer Profile
        .populate({
            path: 'customerId',
            populate: {
                path: 'user',
                select: 'username profilePic'
            }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    res.json({
        success: true,
        count: reviews.length,
        pagination: {
            totalReviews,
            totalPages: Math.ceil(totalReviews / limit),
            currentPage: page,
            limit
        },
        data: reviews
    })
})

const updateReview = asyncHandler(async (req, res) => {
    const { reviewId } = req.params
    const { rating, comment } = req.body

    const customerProfile = await Customer.findOne({ user: req.user.id }).select('_id');
    if (!customerProfile) {
        res.status(404);
        throw new Error('Customer profile not found');
    }

    const review = await Review.findOne({ _id: reviewId, customerId: customerProfile._id });
    if (!review) {
        res.status(404);
        throw new Error('Review not found or unauthorized');
    }

    // Update fields
    review.rating = rating || review.rating
    review.comment = comment ?? review.comment
    await review.save()

    // RECALCULATION: Update Nutritionist Stats
    const stats = await Review.aggregate([
        {
            $match: { nutritionistId: new mongoose.Types.ObjectId(review.nutritionistId) }
        },
        {
            $group: {
                _id: '$nutritionistId',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ])

    if (stats.length > 0) {
        await Nutritionist.findByIdAndUpdate(review.nutritionistId, {
            rating: stats[0].avgRating.toFixed(1),
            reviewCount: stats[0].nRating
        })
    }

    res.json({
        success: true,
        data: review,
        message: "Review updated and nutritionist rating recalculated"
    })
})

module.exports = {
    addReview,
    getReviews,
    updateReview
}