const asyncHandler = require('express-async-handler')
const Nutritionist = require('../model/Nutritionist');
const Appointment = require('../model/Appointment');
const Customer = require('../model/Customer')


const createProfile = asyncHandler(async (req, res) => {
    const { specialization, bio, yearsOfExperience, clientServed, price, languages } = req.body;



    const existingProfile = await Nutritionist.findOne({ user: req.user.id })
    if (existingProfile) {
        res.status(400)
        throw new Error('Profile already exists for this user')
    }

    const profile = await Nutritionist.create({
        user: req.user.id,
        specialization,
        bio,
        yearsOfExperience,
        clientServed,
        cardBio: req.body.cardBio || bio.substring(0, 150),
        price,
        languages
    });

    res.status(201).json(profile)
});

const getProfile = asyncHandler(async (req, res) => {
    const profile = await Nutritionist.findOne({ user: req.user.id })
        .select('user specialization bio yearsOfExperience clientServed rating reviewCount languages price ')
        .populate('user', ['username', 'email'])

    if (!profile) {
        res.status(404)
        throw new Error('Profile not found')
    }

    res.json(profile)
});

const updateProfile = asyncHandler(async (req, res) => {
    const updatedProfile = await Nutritionist.findOneAndUpdate(
        { user: req.user.id },
        req.body,
        { new: true, runValidators: true }
    );

    if (!updatedProfile) {
        res.status(404)
        throw new Error('Profile not found')
    }

    res.json(updatedProfile)
})

const getAllNutritionist = asyncHandler(async (req, res) => {
    const nutritionists = await Nutritionist.find().populate('user', ['username', 'email'])

    if (!nutritionists || nutritionists.length === 0) {
        res.status(404)
        throw new Error('No nutritionists found')
    }

    res.json({
        count: nutritionists.length,
        nutritionists
    })
})

const getFilteredCards = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 0;

    const { specialization, languages, maxPrice, minRating, yearsOfExperience } = req.query
    let queryFilter = {}

    if (specialization) queryFilter.specialization = specialization
    if (languages) queryFilter.languages = languages
    if (maxPrice) queryFilter.price = { $lte: maxPrice }
    if (minRating) queryFilter.rating = { $gte: minRating }
    if (yearsOfExperience) queryFilter.yearsOfExperience = { $gte: yearsOfExperience }

    // 1. Find all unique nutritionist IDs that have at least one 'available' slot
    const availableNutritionistIds = await Appointment.find({ status: 'available' }).distinct('nutritionistId');
    queryFilter.user = { $in: availableNutritionistIds };

    const cards = await Nutritionist.find(queryFilter)
        .populate('user', ['username', 'profilePic'])
        .select('specialization cardBio rating reviewCount price languages')
        .sort({ rating: -1 })
        .limit(limit)

    res.json({ count: cards.length, cards })
})

const getRecommendedForUser = asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({ user: req.user.id })

    const activeGoals = customer?.goals?.filter(goal => goal.status === 'pending') || []
    const userLanguages = customer?.languages || []

    if (activeGoals.length === 0)
        return res.json([])

    const goalKeywords = activeGoals.map(goal => goal.data)

    const recommended = await Nutritionist.find({
        $and: [
            { specialization: { $in: goalKeywords } },
            { languages: { $in: userLanguages } }
        ]
    })
        .populate('user', ['username', 'profilePic'])
        .select('specialization cardBio rating reviewCount price languages')
        .sort({ rating: -1 })
        .limit(10)


    if (recommended.length === 0) {
        const goalOnlyMatch = await Nutritionist.find({
            specialization: { $in: goalKeywords }
        })
            .populate('user', ['username', 'profilePic'])
            .sort({ rating: -1 })
            .limit(10)
        return res.json(goalOnlyMatch)
    }

    

    res.json(recommended);
})



module.exports = { createProfile, getProfile, updateProfile, getAllNutritionist, getFilteredCards, getRecommendedForUser }
