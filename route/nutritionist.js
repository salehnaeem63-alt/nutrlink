const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')
const nutriValidation = require('../middleware/nutriValidation')

const { createProfile, getProfile, updateProfile, getAllNutritionist,
    createUpdateCard, getFilteredCards } = require('../controller/nutritionistController')

router.get('/profile/all', getAllNutritionist)

router.post('/profile/', authToken, nutriValidation, createProfile)
router.get('/profile/me', authToken, nutriValidation, getProfile)
router.put('/profile/me', authToken, nutriValidation, updateProfile)

router.put('/my-card', authToken, nutriValidation, createUpdateCard)
router.get('/cards/filter', authToken, nutriValidation, getFilteredCards)



module.exports = router