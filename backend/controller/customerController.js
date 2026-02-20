const asyncHandler = require('express-async-handler')
const Profile = require('../model/customerProfile')

const createProfile = asyncHandler(async (req,res) => {
    const { age, gender, height, currentWeight, targetWeight, allergies } = req.body;

    const existingProfile = await Profile.findOne({user: req.user.id})
    if(existingProfile) {
        res.status(400)
        throw new Error('Profile already exists for this user')
    }

    const profile = await Profile.create({
        user:req.user.id,
        age,
        gender,
        height,
        currentWeight,
        targetWeight,
        allergies
    });

    res.status(201).json(profile)
});

// 2. Get Current User's Profile
const getProfile = asyncHandler(async (req, res) => {
    // Find profile and populate user details
    const profile = await Profile.findOne({ user: req.user.id }).populate('user', ['username', 'email']);

    if (!profile) {
        res.status(404);
        throw new Error('Profile not found');
    }

    res.json(profile);
});

const updateProfile = asyncHandler(async (req, res) => {
    // Find the user's profile and update it with the new data
    const updatedProfile = await Profile.findOneAndUpdate(
        { user: req.user.id }, // 1. Who to update
        req.body,              // 2. What data to update
        { new: true, runValidators: true } // 3. Options
    );

    // If no profile was found to update
    if (!updatedProfile) {
        res.status(404);
        throw new Error('Profile not found');
    }

    res.json(updatedProfile);
});

module.exports = { createProfile, getProfile, updateProfile }

