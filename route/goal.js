const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')

const { createGoal,goalDone,deleteGoal,getGoal } = require('../controller/customerController')

router.post('/', authToken, createGoal)
router.put('/', authToken, goalDone)
router.delete('/:goal_id', authToken, deleteGoal)
router.get('/', authToken, getGoal)

module.exports = router
