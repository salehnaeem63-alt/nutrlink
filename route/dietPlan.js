const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')
const cusValidation = require('../middleware/cusValidation')
const nutriValidation = require('../middleware/nutriValidation')
const {
    createDiet,
    updateDiet,
    deleteDiet,
    getDiets,
    markMealAsDone,
    addMealToDiet,
    removeMealFromDiet,
    updateMealInDiet
} = require('../controller/dietPlanController')

router.use(authToken)

// General Diet Routes
router.route('/')
    .get(getDiets) // Both roles can access this
    .post(nutriValidation, createDiet); // Nutritionist only

// Specific Diet Routes
router.route('/:id')
    .put(nutriValidation, updateDiet) // Nutritionist only
    .delete(nutriValidation, deleteDiet); // Nutritionist only

router.post('/:id/meals', nutriValidation, addMealToDiet)
router.delete('/:id/meals/:mealId', nutriValidation, removeMealFromDiet);


// 1. Specific path for the Customer to toggle completion
router.patch('/:dietId/meals/:mealId/status', cusValidation, markMealAsDone);

// 2. Base path for the Nutritionist to edit meal details
router.patch('/:dietId/meals/:mealId', nutriValidation, updateMealInDiet); // Customer only
module.exports = router