const User = require('../model/User'); 

const nutriValidation = async (req, res, next) => {
    try {
        console.log("\n🚀 --- NUTRITIONIST VALIDATION CHECK --- 🚀");
        console.log("1. What is inside req.user?", req.user);

        if (!req.user) {
            console.log("❌ RESULT: req.user is missing entirely. The auth token middleware might be failing.");
            return res.status(401).json({ message: "Not authorized, no token data" });
        }

        let role = req.user.role || (req.user.user && req.user.user.role);
        console.log("2. Role found directly in token:", role);

        if (!role) {
            const userId = req.user.id || req.user._id || (req.user.user && (req.user.user.id || req.user.user._id));
            console.log("3. No role in token. Attempting DB lookup with User ID:", userId);
            
            if (userId) {
                const foundUser = await User.findById(userId);
                if (foundUser) {
                    role = foundUser.role;
                    console.log("4. Role found in MongoDB:", role);
                } else {
                    console.log("❌ RESULT: User ID was in token, but nobody was found in MongoDB!");
                }
            } else {
                console.log("❌ RESULT: Could not find any User ID inside the token to do a lookup.");
            }
        }

        if (!role || role.toLowerCase() !== 'nutritionist') {
            console.log(`❌ RESULT: Kicking user out. Final detected role was: ${role}`);
            return res.status(403).json({ message: "Access denied. Nutritionists only." });
        }

        console.log("✅ RESULT: Nutritionist successfully verified! Letting them in.");
        console.log("------------------------------------------\n");
        next();
        
    } catch (error) {
        console.error("❌ NutriValidation Crashed:", error);
        res.status(500).json({ message: "Server error during role validation" });
    }
};

module.exports = nutriValidation;