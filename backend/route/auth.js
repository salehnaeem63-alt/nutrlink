const express=require('express')
const router=express.Router()
const asyncHandler=require('express-async-handler')
/*
method:post
end point:nutrlink/api/auth/register
des:this is rout fot register user
*/
router.post('/register',asyncHandler(async(req,res)=>{
const user= await new User({
        email:req.body.email,
        username:req.body.username,
        password:req.body.passwordnodn
    })
const result= await user.save()
res.status(201).send("you are sined up sucssfuly")
}))








module.exports=router