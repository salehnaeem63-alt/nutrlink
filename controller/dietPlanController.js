const asyncHandler = require('express-async-handler')
const Diet = require('../model/DietPlan')
const Nutritionist = require('../model/Nutritionist')
const Customer = require('../model/Customer')

const createDiet = asyncHandler(async (req, res) => {
    const { customerId, startDate, endDate, meals } = req.body
    
    const nutritionistProfile = await Nutritionist.findOne({ user: req.user.id }).select('_id')
    if (!nutritionistProfile) {
        res.status(404);
        throw new Error('Nutritionist profile not found. Please complete your profile setup.');
    }

    const newDiet = await Diet.create({
        nutritionistId: nutritionistProfile._id,
        customerId, // MUST BE CUSTOMER PROFILE ID FROM FRONTEND
        startDate,
        endDate,
        meals
    })

    res.status(201).json({
        message: 'Diet plan assigned successfully',
        diet: newDiet
    })
});

const updateDiet = asyncHandler(async (req, res) => {
    if (Object.keys(req.body).length === 0)
        return res.status(400).json({ message: "No update data provided" });
    
    const dietId = req.params.id
    const diet = await Diet.findById(dietId)

    if (!diet) {
        res.status(404)
        throw new Error('Diet plan not found')
    }

    const nutritionistProfile = await Nutritionist.findOne({ user: req.user.id }).select('_id');
    if (!nutritionistProfile || diet.nutritionistId.toString() !== nutritionistProfile._id.toString()) {
        res.status(403)
        throw new Error('Not authorized to update this diet plan')
    }

    const updatedDiet = await Diet.findByIdAndUpdate(
        dietId,
        req.body,
        { new: true, runValidators: true }
    );

    res.json({
        message: 'Diet plan updated successfully',
        diet: updatedDiet
    })
})

const deleteDiet = asyncHandler(async (req, res) => {
    const dietId = req.params.id
    const diet = await Diet.findById(dietId)

    if (!diet) {
        res.status(404)
        throw new Error('Diet plan not found')
    }

    const nutritionistProfile = await Nutritionist.findOne({ user: req.user.id }).select('_id');
    if (!nutritionistProfile || diet.nutritionistId.toString() !== nutritionistProfile._id.toString()) {
        res.status(403)
        throw new Error('Not authorized to delete this diet plan')
    }

    await diet.deleteOne()

    res.json({
        message: 'Diet plan deleted successfully',
        Id: dietId
    })
})

const getDiets = asyncHandler(async (req, res) => {
    let query = {};

    if (req.user.role === 'nutritionist') {
        const nutritionistProfile = await Nutritionist.findOne({ user: req.user.id }).select('_id');
        if (!nutritionistProfile) {
            return res.status(404).json({ success: false, message: "Nutritionist profile not found." });
        }
        query.nutritionistId = nutritionistProfile._id; 
    }

    if (req.user.role === 'customer') {
        const customerProfile = await Customer.findOne({ user: req.user.id }).select('_id');
        if (!customerProfile) {
            return res.status(404).json({ success: false, message: "Customer profile not found." });
        }
        query.customerId = customerProfile._id;
    }

    const diets = await Diet.find(query)
        .populate({
            path: 'nutritionistId',
            populate: { path: 'user', select: 'username email' }
        })
        .populate({
            path: 'customerId',
            populate: { path: 'user', select: 'username email' }
        });

    if (diets.length === 0) {
        return res.status(200).json({
            success: true,
            count: 0,
            diets: [],
            message: req.user.role === 'nutritionist'
                ? "You haven't created any diet plans for clients yet."
                : "You don't have any diet plans yet. Start by booking a nutritionist!"
        });
    }

    const formatedDiets = diets.map(diet => {
        const { meals, ...dietObj } = diet.toObject();
        return {
            _id: dietObj._id,
            status: dietObj.status,
            mealCount: meals ? meals.length : 0, 
            progress: dietObj.progress !== undefined ? `${dietObj.progress}%` : '0%',
            ...dietObj,                  
            meals: meals || []           
        };
    });

    res.json({
        count: formatedDiets.length,
        diets: formatedDiets
    })
})

const markMealAsDone = asyncHandler(async (req, res) => {
    const { dietId, mealId } = req.params

    // FIXED: Customer Auth ID -> Profile ID
    const customerProfile = await Customer.findOne({ user: req.user.id }).select('_id');
    if (!customerProfile) {
        res.status(404);
        throw new Error('Customer profile not found');
    }

    const diet = await Diet.findOne({ _id: dietId, customerId: customerProfile._id })

    if (!diet) {
        res.status(404)
        throw new Error('Diet plan not found or unauthorized')
    }

    const meal = diet.meals.id(mealId)

    if(!meal) {
        res.status(404)
        throw new Error('Meal not found')
    }

    meal.isCompleted = !meal.isCompleted

    
    const completedCount = diet.meals.filter(m => m.isCompleted).length;
    const totalMeals = diet.meals.length;
    const progressPercentage = Math.round((completedCount / totalMeals) * 100);
    
    if(progressPercentage === 100) 
        diet.status = 'completed'
    else if(progressPercentage > 0 && progressPercentage < 100)
        diet.status = 'in progress'
    else if(progressPercentage === 0)
        diet.status = 'pending'
    
    diet.progress = progressPercentage
    await diet.save()

    // ─── Auto-sync mealsLogged in DailyLog ───
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // Get today's meals from this diet plan
    const todayMeals = diet.meals.filter(m => {
        const mealDate = new Date(m.date)
        mealDate.setUTCHours(0, 0, 0, 0)
        return mealDate.getTime() === today.getTime()
    })

    // mealsLogged = true only if ALL of today's meals are completed
    const allTodayDone = todayMeals.length > 0 && todayMeals.every(m => m.isCompleted)

    await DailyLog.findOneAndUpdate(
        { user: req.user.id, date: today },
        { $set: { mealsLogged: allTodayDone } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    // ─────────────────────────────────────────

    res.json({
        message: `Meal marked as ${meal.isCompleted ? 'completed' : 'incomplete'}`,
        meal,
        progress: `${progressPercentage}%`,
        dietStatus: diet.status,
        mealsLogged: allTodayDone
    })
})
const addMealToDiet = asyncHandler(async (req, res) => {
    const dietId = req.params.id;
    const { name, date } = req.body; 

    const diet = await Diet.findById(dietId);

    if (!diet) {
        res.status(404);
        throw new Error('Diet plan not found');
    }

    // FIXED: Nutritionist Auth ID -> Profile ID Check
    const nutritionistProfile = await Nutritionist.findOne({ user: req.user.id }).select('_id');
    if (!nutritionistProfile || diet.nutritionistId.toString() !== nutritionistProfile._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to modify meals in this diet plan');
    }

    const mealDate = new Date(date);
    if (mealDate < diet.startDate || mealDate > diet.endDate) {
        res.status(400);
        throw new Error('Meal date must be within the diet plan duration');
    }

    // 🔥 DUPLICATION CHECK: Check if a meal with this name already exists on this date
    const isDuplicate = diet.meals.some(
        (meal) => meal.name === name && meal.date.toISOString() === new Date(date).toISOString()
    );

    if (isDuplicate) {
        res.status(400);
        throw new Error('This meal is already scheduled for this date');
    }

    diet.meals.push(req.body);

    const completedCount = diet.meals.filter(m => m.isCompleted).length;
    const totalMeals = diet.meals.length;
    const progressPercentage = Math.round((completedCount / totalMeals) * 100);
    diet.progress = progressPercentage;

    if (progressPercentage === 100)
        diet.status = 'completed';
    else if (progressPercentage > 0 && progressPercentage < 100)
        diet.status = 'in progress';
    else
        diet.status = 'pending';

    await diet.save();

    res.json({
        message: "Meal added successfully",
        meal: diet.meals[diet.meals.length - 1],
        mealCount: diet.meals.length,
        progress: `${diet.progress}%`, 
        dietStatus: diet.status,
    });
});

const removeMealFromDiet = asyncHandler(async (req, res) => {
    const { id: dietId, mealId: mealId } = req.params

    const diet = await Diet.findById(dietId)

    if (!diet) {
        res.status(404)
        throw new Error('Diet plan not found')
    }

    // FIXED: Nutritionist Auth ID -> Profile ID Check
    const nutritionistProfile = await Nutritionist.findOne({ user: req.user.id }).select('_id');
    if (!nutritionistProfile || diet.nutritionistId.toString() !== nutritionistProfile._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to remove meals in this diet plan');
    }

    const meal = diet.meals.id(mealId)
    if (!meal) {
        res.status(404)
        throw new Error('Meal not found')
    }

    meal.deleteOne()

    const totalMeals = diet.meals.length
    const completedCount = diet.meals.filter(m => m.isCompleted).length
    const progressPercentage = totalMeals === 0 ? 0 : Math.round((completedCount / totalMeals) * 100)

    diet.progress = progressPercentage

    if (totalMeals === 0 || progressPercentage === 0)
        diet.status = 'pending'
    else if (progressPercentage === 100)
        diet.status = 'completed'
    else
        diet.status = 'in progress'

    await diet.save()

    res.json({
        message: 'Meal removed successfully',
        progress: `${diet.progress}%`,
        dietStatus: diet.status,
        mealCount: diet.meals.length
    })
})

const updateMealInDiet = asyncHandler(async (req, res) => {
    if (Object.keys(req.body).length === 0)
        return res.status(400).json({ message: "No update data provided" });

    const { dietId, mealId } = req.params;

    const diet = await Diet.findById(dietId);

    if (!diet) {
        res.status(404);
        throw new Error('Diet plan not found');
    }

    // FIXED: Nutritionist Auth ID -> Profile ID Check
    const nutritionistProfile = await Nutritionist.findOne({ user: req.user.id }).select('_id');
    if (!nutritionistProfile || diet.nutritionistId.toString() !== nutritionistProfile._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to update meals in this diet plan');
    }

    const meal = diet.meals.id(mealId);
    if (!meal) {
        res.status(404);
        throw new Error('Meal not found');
    }

    Object.assign(meal, req.body);

    const totalMeals = diet.meals.length;
    const completedCount = diet.meals.filter(m => m.isCompleted).length;
    const progressPercentage = totalMeals === 0 ? 0 : Math.round((completedCount / totalMeals) * 100);

    diet.progress = progressPercentage;

    if (totalMeals === 0 || progressPercentage === 0) {
        diet.status = 'pending';
    } else if (progressPercentage === 100) {
        diet.status = 'completed';
    } else {
        diet.status = 'in progress';
    }

    await diet.save();

    res.json({
        message: 'Meal updated successfully',
        meal,
        progress: `${diet.progress}%`,
        dietStatus: diet.status
    });
});

module.exports = {
    createDiet,
    updateDiet,
    deleteDiet,
    getDiets,
    markMealAsDone,
    addMealToDiet,
    removeMealFromDiet,
    updateMealInDiet
}