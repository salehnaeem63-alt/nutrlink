const express = require('express');
const router = express.Router();
const authToken = require('../middleware/verifyToken'); 
<<<<<<< HEAD
const { registerUser, loginUser, googleLogin } = require('../controller/authController');
=======
const { registerUser, loginUser } = require('../controller/authController');
>>>>>>> caa20cbc9b380ea9e058cb259b3063f8e64ac581

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

router.post('/google', googleLogin);
/*
 * Test Route
 */
router.get('/', authToken, (req, res) => {
    res.status(200).json("Work done");
});

module.exports = router;