const asyncHandler = require('express-async-handler')
const NutritionistProfile = require('../model/nutritionistProfile')

const createProfile = asyncHandler(async (req,res) => {
    const { specialization, bio, yearsOfExperience, clientServed } = req.body;

    const existingProfile = await NutritionistProfile.findOne({user:req.user.id})
    if(existingProfile) {
        res.status(400)
        throw new Error('Profile already exists for this user')
    }

    const profile = await NutritionistProfile.create({
        user:req.user.id,
        specialization,
        bio,
        yearsOfExperience,
        clientServed
    });

    res.status(201).json(profile)
});

const getProfile = asyncHandler(async (req,res) => {
    const profile = await NutritionistProfile.findOne({user: req.user.id }).populate('user',['username','email'])

    if(!profile) {
        res.status(404)
        throw new Error('Profile not found')
    }

    res.json(profile)
});

const updateProfile = asyncHandler(async (req,res) => {
    const updatedProfile = await NutritionistProfile.findOneAndUpdate(
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
    const nutritionists = await nutritionists.find().populate('user', ['username', 'email'])

    if(!nutritionists || nutritionists.length === 0) {
        res.status(404)
        throw new Error('No nutritionists found')
    }

    res.json(nutritionists)
})


module.exports = { createProfile, getProfile, updateProfile, getAllNutritionist }