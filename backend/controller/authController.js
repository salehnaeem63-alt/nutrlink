const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
<<<<<<< HEAD
const { OAuth2Client } = require('google-auth-library');
const User = require('../model/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

=======
const User = require('../model/User');

>>>>>>> caa20cbc9b380ea9e058cb259b3063f8e64ac581
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

<<<<<<< HEAD
// @desc    Register a new user (Standard)
const registerUser = asyncHandler(async (req, res) => {
    const { error } = registerSchema.validate(req.body);
    if (error) { res.status(400); throw new Error(error.details[0].message); }

    const userExists = await User.findOne({ $or: [{ email: req.body.email }, { username: req.body.username }] });
    if (userExists) { res.status(409); throw new Error(userExists.email === req.body.email ? 'Email is already registered' : 'Username is already taken'); }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

=======
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
>>>>>>> caa20cbc9b380ea9e058cb259b3063f8e64ac581
    const user = await User.create({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        role: req.body.role
<<<<<<< HEAD
        // profilePic will be assigned automatically by Mongoose default
    });

    if (user) {
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ _id: user._id, username: user.username, email: user.email, role: user.role, profilePic: user.profilePic, token });
    } else { res.status(400); throw new Error('Invalid user data'); }
});

// @desc    Login user (Standard)
const loginUser = asyncHandler(async (req, res) => {
    const { error } = loginSchema.validate(req.body);
    if (error) { res.status(400); throw new Error(error.details[0].message); }

    const query = req.body.email ? { email: req.body.email } : { username: req.body.username };
    const user = await User.findOne(query);

    if (user && (await bcrypt.compare(req.body.password, user.password))) {
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
        const { password, ...otherDetails } = user._doc;
        res.status(200).json({ ...otherDetails, token });
    } else { res.status(401); throw new Error('Invalid email/username or password'); }
});

// @desc    Login/Register via Google
// @desc    Login/Register via Google
// @route   POST /api/auth/google
const googleLogin = asyncHandler(async (req, res) => {
    const { token, role } = req.body; // Token sent from React frontend

    // 1. Safety check: Ensure the token exists
    if (!token) {
        res.status(400);
        throw new Error("Google token is missing");
    }

    // 2. Verify the Google ID Token
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { email, name, picture } = ticket.getPayload();

    // 3. Check if user already exists in NutriLink database
    let user = await User.findOne({ email });

    // 4. Create user if they don't exist (First time login)
    if (!user) {
        const salt = await bcrypt.genSalt(10);
        // Random password for security since they use Google
        const hashedPassword = await bcrypt.hash(Math.random().toString(36), salt);

        user = await User.create({
            username: name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
            email: email,
            password: hashedPassword,
            role: role || 'customer',
            profilePic: picture 
        });
    }

    // 5. Generate your application's JWT Token
    const appToken = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
    );

    // 6. CLEAN DATA: Convert to plain object and remove password
    // This is much safer than using ._doc
    const userObject = user.toObject();
    delete userObject.password;

    // 7. Send final response to React
    res.status(200).json({ 
        ...userObject, 
        token: appToken 
    });
});
module.exports = { registerUser, loginUser, googleLogin };
=======
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
>>>>>>> caa20cbc9b380ea9e058cb259b3063f8e64ac581
