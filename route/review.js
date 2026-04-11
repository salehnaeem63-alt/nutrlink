const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')
const isadmin = require('../middleware/isadmin')
const cusValidation = require('../middleware/cusValidation')
const nutriValidation = require('../middleware/nutriValidation')
const {
    addReview,
    getReviews
} = require('../controller/reviewController')

router.get('/:nutritionistId', getReviews)

router.post('/:nutritionistId',authToken, cusValidation, addReview)

module.exports = router
console.log('Review route loaded')