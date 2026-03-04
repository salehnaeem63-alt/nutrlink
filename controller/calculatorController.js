const activityLevels = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
};

// -------- GET Activity Options --------
exports.getActivityOptions = (req, res) => {
    const activityOptions = {
        sedentary: "Sedentary (little or no exercise, mostly sitting)",
        light: "Light activity (exercise 1–3 days per week)",
        moderate: "Moderate activity (exercise 3–5 days per week)",
        active: "Active (exercise 6–7 days per week)",
        very_active: "Very active (intense exercise daily)"
    };

    res.json(activityOptions);
};

// -------- POST Calories Calculator --------
exports.calculateCalories = (req, res) => {
    const { weight, height, age, gender, activity, goal } = req.body;

    if (!weight || !height || !age || !gender || !activity || !goal) {
        return res.status(400).json({ error: "Provide all required fields" });
    }

    const heightInMeters = height > 3 ? height / 100 : height;
    const bmi = weight / (heightInMeters * heightInMeters);

    let BMICategory = "";
    if (bmi < 18.5) BMICategory = "Underweight";
    else if (bmi < 24.9) BMICategory = "Normal weight";
    else if (bmi < 29.9) BMICategory = "Overweight";
    else BMICategory = "Obese";

    let bmr;
    if (gender === "male")
        bmr = 10 * weight + 6.25 * (heightInMeters * 100) - 5 * age + 5;
    else if (gender === "female")
        bmr = 10 * weight + 6.25 * (heightInMeters * 100) - 5 * age - 161;
    else
        return res.status(400).json({ error: "Invalid gender" });

    const activityFactor = activityLevels[activity];
    if (!activityFactor) {
        return res.status(400).json({ error: "Invalid activity level" });
    }

    const maintenance = bmr * activityFactor;

    let target = maintenance;
    if (goal === "cut") target -= 500;
    else if (goal === "bulk") target += 500;

    res.json({
        BMI: bmi.toFixed(2),
        BMICategory,
        BMR: bmr.toFixed(2),
        MaintenanceCalories: maintenance.toFixed(2),
        TargetCalories: target.toFixed(2)
    });
};