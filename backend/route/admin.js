const express=require('express')
const router=express.Router()
const asyncHandler=require('express-async-handler')
const User = require('../model/User')
dotenv.config()
const authToken=require('../middleware/verifyToken')
const checkAdmin=require('../middleware/isadmin')
router.put('/approve/:id', authToken, checkAdmin, asyncHandler(async (req, res) => {
    
    const user = await User.findById(req.params.id)

    if (!user) {
        return res.status(404).json("User not found")
    }
    
    user.isApproved = true
    await user.save()

    res.status(200).json({
        message: "User approved successfully",
        user
    })
}))

module.exports=router