const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../model/User');
const authToken = require('../middleware/verifyToken'); 

// --- VALIDATION SCHEMAS ---

const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    // Validate email and ensure strictly .com or .net
    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).required(),
    password: Joi.string()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})'))
        .required()
        .messages({ 'string.pattern.base': 'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.'}),
    role: Joi.string().valid('customer', 'nutritionist').required()
});

const loginSchema = Joi.object({
    email: Joi.string().email(),
    username: Joi.string(),
    password: Joi.string().required()
}).xor('email', 'username'); // MUST have email OR username, never both

// --- ROUTES ---

/*
 * Method: POST
 * Endpoint: /api/auth/register
 * Desc: Register a new user
 */
router.post('/register', asyncHandler(async (req, res) => {
    // 1. Validate Input
    const { error } = registerSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }

// 2. Check if user exists (by email OR username)
    // We check both to ensure no duplicates in the database
    const userExists = await User.findOne({ 
        $or: [{ email: req.body.email }, { username: req.body.username }] 
    });

    if (userExists) {
        res.status(409); // 409 = Conflict
        
        // Dynamic message so the user knows exactly what is taken
        const message = userExists.email === req.body.email 
            ? 'Email is already registered' 
            : 'Username is already taken';
            
        throw new Error(message);
    }

    // 3. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // 4. Create User
    const user = await User.create({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        role: req.body.role
    });

    // 5. Generate Token and Send Response
    if (user) {
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
}));

/*
 * Method: POST
 * Endpoint: /api/auth/login
 * Desc: Login user with Email OR Username
 */
router.post('/login', asyncHandler(async (req, res) => {
    // 1. Validate Input
    const { error } = loginSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }

    // 2. DYNAMIC SEARCH: Check if we received an email or a username
    const query = req.body.email 
        ? { email: req.body.email } 
        : { username: req.body.username };

    // 3. Find the user based on that query
    const user = await User.findOne(query);

    // 4. Verify User AND Password
    // If 'user' is null (not found), this condition fails immediately.
    // If 'user' is found, we check the password.
    if (user && (await bcrypt.compare(req.body.password, user.password))) {
        
        // Login Success!
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Remove password from response
        const { password, ...otherDetails } = user._doc;
        
        res.status(200).json({ ...otherDetails, token });

    } else {
        // Login Failed (Either User Not Found OR Password Wrong)
        res.status(401);
        // UPDATED MESSAGE: Covers both username and email cases
        throw new Error('Invalid email/username or password');
    }
}));

/*
 * Test Route
 */
router.get('/', authToken, asyncHandler(async (req, res) => {
    res.status(200).json("Work done");
}));

module.exports = router;