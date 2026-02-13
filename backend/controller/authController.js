const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../model/User');

// --- VALIDATION SCHEMAS ---
const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
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
}).xor('email', 'username');

// --- CONTROLLER FUNCTIONS ---

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    // 1. Validate Input
    const { error } = registerSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }

    // 2. Check if user exists
    const userExists = await User.findOne({ 
        $or: [{ email: req.body.email }, { username: req.body.username }] 
    });

    if (userExists) {
        res.status(409);
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

    // 5. Generate Token
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
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    // 1. Validate Input
    const { error } = loginSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }

    // 2. Find User
    const query = req.body.email 
        ? { email: req.body.email } 
        : { username: req.body.username };

    const user = await User.findOne(query);

    // 3. Verify Password
    if (user && (await bcrypt.compare(req.body.password, user.password))) {
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        const { password, ...otherDetails } = user._doc;
        res.status(200).json({ ...otherDetails, token });
    } else {
        res.status(401);
        throw new Error('Invalid email/username or password');
    }
});

module.exports = { registerUser, loginUser };