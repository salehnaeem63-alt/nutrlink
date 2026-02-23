const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')

const { createProfile, getProfile, updateProfile, getAllNutritionist,
    createUpdateCard, getFilteredCards     } = require('../controller/nutritionistController')

router.get('/profile/all', getAllNutritionist)

router.post('/profile/', authToken, createProfile)
router.get('/profile/me', authToken, getProfile)
router.put('/profile/me', authToken, updateProfile)

router.put('/my-card', authToken, createUpdateCard)
router.get('/cards/filter', authToken, getFilteredCards)



module.exports = router