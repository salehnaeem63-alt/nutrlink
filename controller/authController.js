const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { OAuth2Client } = require('google-auth-library');
const cloudinary = require('cloudinary').v2;
const User = require('../model/User');

// 👉 EMAIL
const sendEmail = require('./emailController');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- CLOUDINARY CONFIG ---
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ CLOUDINARY ERROR: Missing environment variables!');
} else {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('✅ Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);
}

// --- VALIDATION ---
const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    role: Joi.string().valid('customer', 'nutritionist').required()
});

const loginSchema = Joi.object({
    identifier: Joi.string().required(),
    password: Joi.string().required()
});

// --- CLOUDINARY UPLOAD ---
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

// ================= REGISTER =================
const registerUser = asyncHandler(async (req, res) => {

    console.log("🔥 REGISTER REACHED");

    const { error } = registerSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }

    const { username, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(409);
        throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let credentialImage = null;
    if (role === 'nutritionist' && req.file) {
        credentialImage = await uploadToCloudinary(req.file.buffer, 'credentials');
    }

    const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role,
        credentialImage,
        isApproved: role === 'customer'
    });

    if (user) {

        console.log("📨 REGISTER EMAIL TRIGGERED");

        try {
            await sendEmail(
                user.email,
                "Welcome 🎉",
                `Hello ${user.username}, welcome to NutriLink!`
            );

            console.log("📧 REGISTER EMAIL SENT SUCCESS");

        } catch (err) {
            console.log("❌ REGISTER EMAIL ERROR:", err.message);
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        return res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token
        });
    }
});

// ================= LOGIN =================
const loginUser = asyncHandler(async (req, res) => {

    const { error } = loginSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }

    const { identifier, password } = req.body;

    const user = await User.findOne({
        $or: [{ email: identifier }, { username: identifier }]
    });

    if (user && await bcrypt.compare(password, user.password)) {

        console.log("🔥 LOGIN SUCCESS REACHED");

        try {
            await sendEmail(
                user.email,
                "Login Alert 🔔",
                `Hi ${user.username}, you just logged in to NutriLink.`
            );
        } catch (err) {
            console.log("❌ LOGIN EMAIL ERROR:", err.message);
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        const { password, ...safeUser } = user._doc;

        return res.json({ user: safeUser, token });

    } else {
        res.status(401);
        throw new Error('Invalid credentials');
    }
});

// ================= GOOGLE LOGIN =================
const googleLogin = asyncHandler(async (req, res) => {

    const { token, role } = req.body;

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
        user = await User.create({
            username: name,
            email,
            password: await bcrypt.hash("123456", 10),
            role: role || 'customer',
            profilePic: picture,
            isApproved: true
        });
    }

    const appToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

    const { password, ...safeUser } = user._doc;

    res.json({ user: safeUser, token: appToken });
});

module.exports = { registerUser, loginUser, googleLogin };