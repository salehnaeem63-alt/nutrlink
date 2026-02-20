const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')

const { createProfile, getProfile, updateProfile, getAllNutritionist } = require('../controller/nutritionistController')

router.get('/all', getAllNutritionist)

router.post('/', authToken, createProfile)
router.get('/me', authToken, getProfile)
router.put('/me', authToken, updateProfile)

module.exports = router