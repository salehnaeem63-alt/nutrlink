const asyncHandler = require('express-async-handler')
const Profile = require('../model/customer')
const Customers = require('../model/Customer')
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
//creat new goal
// rout: nutrlink/api/customer/goal/
const createGoal=asyncHandler(async(req,res)=>{
    const newGoal={
        data:req.body.data,
    }
    const goal=await Customers.findOneAndUpdate(
        {user:req.user.id},
        {$push:{goals:newGoal}},
        {new:true})
        if(!goal){return res.status(404).json("the customer not found")}
        res.status(201).json(goal)
}) 
//make goal as done
// rout: nutrlink/api/customer/goal/
const goalDone=asyncHandler(async(req,res)=>{
    const goal= await Customers.findOneAndUpdate({user:req.user.id,"goals._id":req.body.goal_id},
        {$set:{"goals.$.status":"done"}},{new:true})
                if(!goal){return res.status(404).json("the customer not found or the goal id is wrong")}
        res.status(200).json(goal)
})
//remove goal 
// rout: nutrlink/api/customer/goal/
const deleteGoal=asyncHandler(async(req,res)=>{
    const goal= await Customers.findOneAndUpdate({user:req.user.id},
        {$pull:{goals:{_id:req.params.goal_id}}},
        {new:true}
    )
            if(!goal){return res.status(404).json("the customer not found")}
        res.status(200).json(goal)
})
//get all goal 
// rout: nutrlink/api/customer/goal
const getGoal=asyncHandler(async(req,res)=>{
    const goal= await Customers.findOne({user:req.user.id},
        {goals:1,_id:0}
    )
            if(!goal){return res.status(404).json("the customer not found")}
        res.status(200).json(goal)
})
module.exports = { createProfile, getProfile, updateProfile,createGoal,goalDone,deleteGoal,getGoal }

