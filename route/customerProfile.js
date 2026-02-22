const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')

const { createProfile, getProfile, updateProfile ,createGoal,goalDone,deleteGoal,getGoal } = require('../controller/customerController')
//profilec
router.post('/', authToken, createProfile)
router.get('/me', authToken, getProfile)
router.put('/me', authToken, updateProfile)

//goals
router.post('/',authToken,createGoal)
router.put('/',authToken,goalDone)
router.delete('/:goal_id',authToken,deleteGoal)
router.get('/',authToken,getGoal)

module.exports=router

