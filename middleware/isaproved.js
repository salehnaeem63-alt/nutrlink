/**
 * isApproved middleware
 *
 * Must be used AFTER verifyToken.
 * Blocks any nutritionist whose account has not yet been approved by an admin.
 * Customers are always let through (they are auto-approved on registration).
 */
const isApproved = (req, res, next) => {
    // req.user is set by verifyToken
    if (req.user.role === 'nutritionist' && !req.user.isApproved) {
        return res.status(403).json({
            message: 'Your nutritionist account is pending admin approval. You will be notified once it is activated.'
        });
    }
    next();
};

module.exports = isApproved;