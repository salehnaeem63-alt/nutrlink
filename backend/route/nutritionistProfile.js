const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')

const { createProfile, getProfile, updateProfile, getAllnutritionist } = require('../controller/nutritionistController')

router.post('/', authToken, createProfile)
router.get('/me', authToken, getProfile)
router.put('/me', authToken, updateProfile)
router.get('/all', authToken, getAllnutritionist)

module.exports = router