const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { OAuth2Client } = require('google-auth-library');
const cloudinary = require('cloudinary').v2;
const User = require('../model/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- CLOUDINARY CONFIG WITH ERROR CHECKING ---
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ CLOUDINARY ERROR: Missing environment variables!');
    console.error('Please add these to your .env file:');
    console.error('  CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.error('  CLOUDINARY_API_KEY=your_api_key');
    console.error('  CLOUDINARY_API_SECRET=your_api_secret');
    console.error('\nGet credentials from: https://cloudinary.com/console');
} else {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('✅ Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);
}

// --- VALIDATION SCHEMAS ---
const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).required(),
    password: Joi.string()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,30})'))
        .required()
        .messages({ 'string.pattern.base': 'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.' }),
    role: Joi.string().valid('customer', 'nutritionist').required()
});

const loginSchema = Joi.object({
    email: Joi.string().email(),
    username: Joi.string(),
    password: Joi.string().required()
}).xor('email', 'username');

// --- HELPER ---
/**
 * Upload a file buffer to Cloudinary and return the secure URL.
 * @param {Buffer} buffer  – file buffer from multer memoryStorage
 * @param {string} folder  – Cloudinary folder path
 */
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_API_KEY) {
            return reject(new Error('Cloudinary not configured. Check your .env file.'));
        }

        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(error);
                }
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

// --- CONTROLLER FUNCTIONS ---

// @desc    Register a new user
//          Nutritionists must upload a credential image (multipart/form-data).
//          Customers are auto-approved; nutritionists start as isApproved: false.
// @route   POST /api/auth/register
const registerUser = asyncHandler(async (req, res) => {
    const { error } = registerSchema.validate(req.body);
    if (error) { res.status(400); throw new Error(error.details[0].message); }

    const { username, email, password, role } = req.body;

    // Nutritionists must supply a credential image
    if (role === 'nutritionist' && !req.file) {
        res.status(400);
        throw new Error('Nutritionists must upload a credential image.');
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
        res.status(409);
        throw new Error(
            userExists.email === email
                ? 'Email is already registered'
                : 'Username is already taken'
        );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload credential image to Cloudinary for nutritionists
    let credentialImage = null;
    if (role === 'nutritionist') {
        try {
            credentialImage = await uploadToCloudinary(
                req.file.buffer,
                'nutriplan/credentials'
            );
            console.log('✅ Credential uploaded:', credentialImage);
        } catch (uploadError) {
            console.error('❌ Cloudinary upload failed:', uploadError);
            res.status(500);
            throw new Error('Failed to upload credential image. Please check Cloudinary configuration.');
        }
    }

    // Customers are immediately approved; nutritionists wait for admin review
    const isApproved = role === 'customer';

    const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role,
        isApproved,
        credentialImage,
    });

    if (user) {
        // Return a token for customers so they can access the app right away.
        // Nutritionists get a token too, but protected routes will check isApproved.
        const token = jwt.sign(
            { id: user._id, role: user.role, isadmin: user.isadmin },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
        res.status(201).json({
            _id:             user._id,
            username:        user.username,
            email:           user.email,
            role:            user.role,
            isApproved:      user.isApproved,
            profilePic:      user.profilePic,
            credentialImage: user.credentialImage,
            token,
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Login user
// @route   POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
    const { error } = loginSchema.validate(req.body);
    if (error) { res.status(400); throw new Error(error.details[0].message); }

    const query = req.body.email ? { email: req.body.email } : { username: req.body.username };
    const user = await User.findOne(query);

    if (user && (await bcrypt.compare(req.body.password, user.password))) {
        // Block unapproved nutritionists from logging in
        if (user.role === 'nutritionist' && !user.isApproved) {
            res.status(403);
            throw new Error('Your account is pending admin approval. You will be notified once approved.');
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, isadmin: user.isadmin },
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

// @desc    Login/Register via Google
// @route   POST /api/auth/google
const googleLogin = asyncHandler(async (req, res) => {
    const { token, role } = req.body;

    if (!token) { res.status(400); throw new Error('Google token is missing'); }

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();
    let user = await User.findOne({ email });

    if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Math.random().toString(36), salt);

        // Google-registered nutritionists still need manual approval;
        // they must later upload credentials via a dedicated endpoint.
        const isApproved = (role || 'customer') === 'customer';

        user = await User.create({
            username:   name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
            email,
            password:   hashedPassword,
            role:       role || 'customer',
            profilePic: picture,
            isApproved,
        });
    }

    // Block unapproved nutritionists
    if (user.role === 'nutritionist' && !user.isApproved) {
        res.status(403);
        throw new Error('Your account is pending admin approval.');
    }

    const appToken = jwt.sign(
        { id: user._id, role: user.role, isadmin: user.isadmin },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

    const userObject = user.toObject();
    delete userObject.password;

    res.status(200).json({ ...userObject, token: appToken });
});

module.exports = { registerUser, loginUser, googleLogin };