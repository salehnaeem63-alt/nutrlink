const express = require("express");
const mongoose=require('mongoose')
const cors=require('cors')
const app=express()
app.use(express.json());
app.use(cors());
const asyncHandler=require("express-async-handler")
app.use('/api/nutrlink/test',require('./rout/waterIntake'))
mongoose.connect("mongodb://127.0.0.1:27017/waterintake")
module.exports=app
