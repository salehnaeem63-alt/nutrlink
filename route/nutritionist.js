const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')
const nutriValidation = require('../middleware/nutriValidation')

const { createProfile, getProfile, getProfileById, updateProfile, getAllNutritionist,
    getFilteredCards, getRecommendedForUser } = require('../controller/nutritionistController')

router.get('/profile/all', getAllNutritionist)

router.post('/profile/', authToken, nutriValidation, createProfile)
router.get('/profile/me', authToken, nutriValidation, getProfile)
router.put('/profile/me', authToken, nutriValidation, updateProfile)

router.get('/cards', getFilteredCards)
router.get('/recommended', authToken, getRecommendedForUser)

router.get('/profile/:userId', authToken, getProfileById);

module.exports = router