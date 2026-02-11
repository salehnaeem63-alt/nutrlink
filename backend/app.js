const express = require("express");
const app= express()
const connectDB=require('./config/db')
connectDB()
app.use(express.json())
app.use('/nutrlink/api/auth',require('./route/auth'))
const PORT=5000
app.listen(PORT,()=>{console.log("server is running in port 3000")})