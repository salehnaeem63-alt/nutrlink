const express=require('express')
const router=express.Router()
const asyncHandler=require('express-async-handler')
const bcrypt=require('bcrypt')
const User = require('../model/User')
const jwt= require('jsonwebtoken')
const dotenv=require('dotenv')
const joi=require('joi')
dotenv.config()
const authToken=require('../middleware/verifyToken')
//validation for register
const registervali= joi.object({
    email:joi.string().required()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }),
    username:joi.string().alphanum().min(3).max(30).required(),
    password:joi.string().pattern(new RegExp('^[a-zA-Z0-9]{8,30}$')).required(),
    role: joi.string().valid('customer', 'nutritionist').required()
})

const loginVali = joi.object({
    email: joi.string().email(),
    username: joi.string(),
    password: joi.string().required()
}).xor('email', 'username');

/*
method:post
end point:nutrlink/api/auth/register
des:this is rout fot register user
*/
router.post('/register',asyncHandler(async(req,res)=>{
    //validation
    const{error}=registervali.validate(req.body)
    if(error){
        return res.status(400).json(error.details[0].message)
    }
    //check for existing
    isExist=await User.findOne({email:req.body.email})
    if(isExist){
        return res.status(409).json("the user is already exists")
    }
    // password hashing
    const salt=await bcrypt.genSalt(10)
    req.body.password=await bcrypt.hash(req.body.password,salt)
    //creating the user
const user= await new User({
        email:req.body.email,
        username:req.body.username,
        password:req.body.password,
        role:req.body.role
    })
const result= await user.save()
//creat the token
const token =jwt.sign(
    {id:user._id,username:user.username},
    process.env.JWT_SECRET,{expiresIn: '30d'})
res.status(201).json(token)
}))






// Login validation
/*
method: POST
endpoint: /api/auth/login
desc: Login user
*/
router.post('/login',asyncHandler(async (req,res) => {
    const { error } = loginVali.validate(req.body)
    if(error)
        return res.status(400).json(error.details[0].message)

    const user = await User.findOne({
    $or: [
        { email: req.body.email },
        { username: req.body.username }
    ]
})
    if(!user) 
        return res.status(400).json("Invalid login")

    const isPassowrdMatch = await bcrypt.compare(req.body.password,user.password)
    if(!isPasswordMatch)
        return res.status(400).json("Invalid login")

    const token = jwt.sign({id:user._id, role:user.role}, process.env.JWT_SECRET, {expiresIn: '30d'})

    const { password, ...other} = user._doc
    res.status(200).json({...other, token})

}))


//xasca
router.get('/',authToken,asyncHandler(async(req,res)=>{
res.status(200).json("work done")
}))



module.exports=router