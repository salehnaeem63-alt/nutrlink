const express = require("express");
const app= express()
const connectDB=require('./config/db')
const dotenv=require('dotenv')
dotenv.config()
connectDB()
app.use(express.json())
app.use('/nutrlink/api/auth',require('./route/auth'))
const PORT= process.env.PORT
app.listen(PORT,()=>{console.log("server is running in port 5000")})