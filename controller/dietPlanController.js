const asyncHandler = require('express-async-handler')
const Diet = require('../model/DietPlan')

const createDiet = asyncHandler(async (req,res) => {
    const {customerId, startDate, endDate, meals } = req.body
    const nutritionistId = req.user.id

    const newDiet = await Diet.create({
        nutritionistId,
        customerId,
        startDate,
        endDate,
        meals
    })

    res.status(201).json({
        message: 'Diet plan assigned successfully',
        diet: newDiet
    })
});

const updateDiet = asyncHandler(async (req ,res) => {
    if (Object.keys(req.body).length === 0)
        return res.status(400).json({ message: "No update data provided" });
    const dietId = req.params.id

    const diet = await Diet.findById(dietId)

    if(!diet) {
        res.status(404)
        throw new Error('Diet plan not found')
    }

    if(diet.nutritionistId.toString() !== req.user.id) {
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

    if(!diet) {
        res.status(404)
        throw new Error('Diet plan not found')
    }

    if(diet.nutritionistId.toString() !== req.user.id) {
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
    let query = {}

    if(req.user.role === 'nutritionist')
        query.nutritionistId = req.user.id

    if(req.user.role === 'customer')
        query.customerId = req.user.id

    const diets = await Diet.find(query)
        .populate('nutritionistId', 'username email')
        .populate('customerId', 'username email')
    

    const formatedDiets = diets.map(diet => {
const { meals, ...dietObj } = diet.toObject()

        return {
            _id: dietObj._id,
            status: dietObj.status,
            mealCount: meals.length,     // ✅ Now meals is defined!
            progress: `${dietObj.progress}%`,
            ...dietObj,                  // Spreads the rest of the diet details
            meals: meals                 // ✅ Puts the long array at the very bottom
        }
    })
    res.json({
        count: formatedDiets.length,
        diets: formatedDiets
    })
})

const markMealAsDone = asyncHandler(async (req, res) => {
    const { dietId, mealId } = req.params

    const diet = await Diet.findOne({ _id: dietId, customerId: req.user.id })

    if(!diet) {
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

    res.json({
        message: `Meal marked as ${meal.isCompleted ? 'completed' : 'incomplete'}`,
        meal: meal,
        progress: `${progressPercentage}%`,
        dietStatus: diet.status
    })
})

const addMealToDiet = asyncHandler(async (req, res) => {
    const dietId = req.params.id;
    const { name, date } = req.body; // Extract name and date to check
    
    const diet = await Diet.findById(dietId);

    if(!diet) {
        res.status(404);
        throw new Error('Diet plan not found');
    }

    if(diet.nutritionistId.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to add meals');
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

    // Recalculate progress and status
    const completedCount = diet.meals.filter(m => m.isCompleted).length;
    const totalMeals = diet.meals.length;
    const progressPercentage = Math.round((completedCount / totalMeals) * 100);
    diet.progress = progressPercentage;

    if(progressPercentage === 100)
        diet.status = 'completed';
    else if(progressPercentage > 0 && progressPercentage < 100)
        diet.status = 'in progress';
    else
        diet.status = 'pending';

    await diet.save();

    res.json({
        message: "Meal added successfully",
        meal: diet.meals[diet.meals.length - 1],
        mealCount: diet.meals.length,
        progress: `${diet.progress}%`, // Added the % sign for consistency
        dietStatus: diet.status,
    });
});

const removeMealFromDiet = asyncHandler(async (req, res) => {
    const { id: dietId, mealId: mealId } = req.params

    const diet = await Diet.findById(dietId)

    if(!diet) {
        res.status(404)
        throw new Error('Diet plan not found')
    }

    if(diet.nutritionistId.toString() !== req.user.id) {
        res.status(403)
        throw new Error('Not authorized to remove meals')
    }

    const meal = diet.meals.id(mealId)
    if(!meal) {
        res.status(404)
        throw new Error('Meal not found')
    }

    meal.deleteOne()

    const totalMeals = diet.meals.length
    const completedCount = diet.meals.filter(m => m.isCompleted).length
    const progressPercentage = totalMeals === 0 ? 0 : Math.round(( completedCount / totalMeals ) * 100)

    diet.progress = progressPercentage

    if(totalMeals === 0 || progressPercentage === 0)
        diet.status = 'pending'
    else if(progressPercentage === 100)
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

    // Authorization check
    if (diet.nutritionistId.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to update meals');
    }

    // Find the specific meal
    const meal = diet.meals.id(mealId);
    if (!meal) {
        res.status(404);
        throw new Error('Meal not found');
    }

    // Update meal fields dynamically
    // Using Object.assign allows us to update only the fields sent in req.body
    Object.assign(meal, req.body);

    // Recalculate progress
    const totalMeals = diet.meals.length;
    const completedCount = diet.meals.filter(m => m.isCompleted).length;
    const progressPercentage = totalMeals === 0 ? 0 : Math.round((completedCount / totalMeals) * 100);

    diet.progress = progressPercentage;

    // Update status logic
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