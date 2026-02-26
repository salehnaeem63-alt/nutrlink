const asyncHandler = require('express-async-handler')
const Nutritionist = require('../model/Nutritionist');

const createProfile = asyncHandler(async (req,res) => {
    const { specialization, bio, yearsOfExperience, clientServed } = req.body;
    

    const existingProfile = await Nutritionist.findOne({user:req.user.id})
    if(existingProfile) {
        res.status(400)
        throw new Error('Profile already exists for this user')
    }

    const profile = await Nutritionist.create({
        user:req.user.id,
        specialization,
        bio,
        yearsOfExperience,
        clientServed,
        price
    });

    res.status(201).json(profile)
});

const getProfile = asyncHandler(async (req,res) => {
    const profile = await Nutritionist.findOne({user: req.user.id })
    .select('specialization bio yearsOfExperience clientServed rating reviewCount languages price ')
    .populate('user',['username','email'])

    if(!profile) {
        res.status(404)
        throw new Error('Profile not found')
    }

    res.json(profile)
});

const updateProfile = asyncHandler(async (req,res) => {
    const updatedProfile = await Nutritionist.findOneAndUpdate(
        { user: req.user.id},
        req.body,
        { new: true, runValidators:true }
    );

    if(!updatedProfile) {
        res.status(404)
        throw new Error('Profile not found')
    }

    res.json(updatedProfile)
})

const getAllNutritionist = asyncHandler(async (req,res) => {
    const nutritionists = await Nutritionist.find().populate('user', ['username', 'email'])

    if(!nutritionists || nutritionists.length === 0) {
        res.status(404)
        throw new Error('No nutritionists found')
    }

    res.json({
        count: nutritionists.length,
        nutritionists
    })
})


// Cards Work
const createUpdateCard = asyncHandler(async (req,res) => {
    const { 
        specialization, 
        cardBio, 
        languages, 
        price
    } = req.body;

    const card = await Nutritionist.findOneAndUpdate(
        { user: req.user.id },
        {
            user: req.user.id,
            specialization,
            cardBio,
            languages,
            price
        },
        { new: true, upsert: true } // Add this!
    ).select('specialization cardBio languages price yearsOfExperience reviewCount rating clientServed');

    res.json(card); // Add this!
});

const getFilteredCards = asyncHandler(async (req,res) => {
    const { specialization, languages, maxPrice, minRating, yearsOfExperience } = req.query

    let queryFilter = {}

    if(specialization) queryFilter.specialization = specialization
    if(languages) queryFilter.languages = languages
    if(maxPrice) queryFilter.price = { $lte: maxPrice }
    if(minRating) queryFilter.rating = { $gte: minRating }
    if(yearsOfExperience) queryFilter.yearsOfExperience = { $gte: yearsOfExperience }

    const cards = await Nutritionist.find(queryFilter)
    .populate('user', ['username',' profilePic'])
    .select('specialization cardBio rating reviewCount price languages')

    res.json({count: cards.length, cards})
})


module.exports = { createProfile, getProfile, updateProfile, getAllNutritionist, createUpdateCard, getFilteredCards }