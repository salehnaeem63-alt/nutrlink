const express      = require('express');
const router       = express.Router();
const asyncHandler = require('express-async-handler');
const dotenv       = require('dotenv'); // ← was missing in original
const User         = require('../model/User');
const authToken    = require('../middleware/verifyToken');
const checkAdmin   = require('../middleware/isadmin');

dotenv.config();

// @desc    Get all pending nutritionists (isApproved: false)
//          Useful for the admin dashboard to review credential images.
// @route   GET /api/admin/pending
router.get('/pending', authToken, checkAdmin, asyncHandler(async (_req, res) => {
    const pending = await User.find(
        { role: 'nutritionist', isApproved: false },
        '-password'        // exclude password field
    ).sort({ createdAt: -1 });

    res.status(200).json(pending);
}));

// @desc    Approve a nutritionist — grants access to protected features
// @route   PUT /api/admin/approve/:id
router.put('/approve/:id', authToken, checkAdmin, asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'nutritionist') {
        return res.status(400).json({ message: 'Only nutritionist accounts require approval.' });
    }

    if (user.isApproved) {
        return res.status(400).json({ message: 'User is already approved.' });
    }

    user.isApproved = true;
    await user.save();

    const { password, ...safeUser } = user.toObject();
    res.status(200).json({
        message: 'Nutritionist approved successfully.',
        user: safeUser,
    });
}));

// @desc    Reject / revoke a nutritionist's approval
// @route   PUT /api/admin/reject/:id
router.put('/reject/:id', authToken, checkAdmin, asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    user.isApproved = false;
    await user.save();

    const { password, ...safeUser } = user.toObject();
    res.status(200).json({
        message: 'User approval revoked.',
        user: safeUser,
    });
}));

module.exports = router;