const express=require('express')
const router=express.Router()
const asyncHandler=require('express-async-handler')
const Test=require('../module/WaterIntake')
router.post('/create',asyncHandler(async(req,res)=>{
      const user= await new Test({
        name:req.body.name,
        amoutOfWater:0
    })
    await user.save();
    res.status(201).json(user)
}))
router.put('/:id',asyncHandler(async(req,res)=>{
    const t= await Test.findByIdAndUpdate(req.params.id,{$inc:
        {amoutOfWater:req.body.amoutOfWater
        }},{new:true})
        if(t.amoutOfWater>=1000)
    res.status(200).send("you are finsh your need of water today")
        else
                res.status(200).send({a:t.amoutOfWater})


}))
module.exports=router