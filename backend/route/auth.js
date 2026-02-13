const express = require('express');
const router = express.Router();
const authToken = require('../middleware/verifyToken'); 
const { registerUser, loginUser } = require('../controller/authController');

// --- ROUTES ---

/*
 * Method: POST
 * Endpoint: /api/auth/register
 */
router.post('/register', registerUser);

/*
 * Method: POST
 * Endpoint: /api/auth/login
 */
router.post('/login', loginUser);

/*
 * Test Route
 */
router.get('/', authToken, (req, res) => {
    res.status(200).json("Work done");
});

module.exports = router;