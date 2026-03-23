const express = require('express');
const router = express.Router();
const authToken = require('../middleware/verifyToken');

const { createProfile, getProfile, updateProfile, createGoal, goalDone, deleteGoal, getGoal
} = require('../controller/customerController');

// ─── Profile Routes ──────────────────────────────────────────
// Base route: /api/customer/
router.post('/', authToken, createProfile);
router.get('/me', authToken, getProfile);
router.put('/me', authToken, updateProfile);

// ─── Goal Management Routes ──────────────────────────────────
// Base route: /api/customer/goal/

// 1. Get all goals for the current user
router.get('/goal', authToken, getGoal);

// 2. Add a new goal
router.post('/goal', authToken, createGoal);

// 3. Mark a specific goal as "done"
// Note: This matches your goalDone controller which looks for goal_id in req.body
router.put('/goal/done', authToken, goalDone);

// 4. Delete a specific goal
// Note: This matches your deleteGoal controller which uses req.params.goal_id
router.delete('/goal/:goal_id', authToken, deleteGoal);

module.exports = router;