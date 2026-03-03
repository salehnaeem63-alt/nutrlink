const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')
const nutriValidation = require('../middleware/nutriValidation')
const {
    getNutritionistDashboard,
    getChartData
} = require('../controller/dashboardController')
router.use(authToken)
router.use(nutriValidation)

router.get('/stats', getNutritionistDashboard)
router.get('/chart', getChartData)

module.exports = router