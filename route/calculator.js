const express = require("express");
const router = express.Router();

const calorieController = require("../controller/calculatorController");

router.get("/activity-options", calorieController.getActivityOptions);
router.post("/calories", calorieController.calculateCalories);

module.exports = router;