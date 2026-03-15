const express = require("express");
const router = express.Router();
const DailyLog = require("../model/Progress");
const DietPlan = require("../model/DietPlan");
const Customer = require("../model/Customer");
const Appointment = require("../model/Appointment");
const authToken = require("../middleware/verifyToken");
const cusValidation = require("../middleware/cusValidation");

router.use(authToken, cusValidation);

// ─────────────────────────────────────────────
//  POST /progress/log
// ─────────────────────────────────────────────
router.post("/log", async (req, res) => {
  try {
    const { waterIntake, exerciseMinutes, weight } = req.body;
    const userId = req.user.id;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const log = await DailyLog.findOneAndUpdate(
      { user: userId, date: today },
      {
        $set: {
          ...(waterIntake !== undefined && { waterIntake }),
          ...(exerciseMinutes !== undefined && { exerciseMinutes }),
          ...(weight !== undefined && { weight }),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, message: "Daily log saved.", log });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /progress/log/today
// ─────────────────────────────────────────────
router.get("/log/today", async (req, res) => {
  try {
    const userId = req.user.id;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const log = await DailyLog.findOne({ user: userId, date: today });

    res.status(200).json({
      success: true,
      log: log || { waterIntake: 0, exerciseMinutes: 0, weight: null, mealsLogged: false },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /progress/log/history?days=30 OR ?period=monthly
//  Supports: daily (7, 14, 30 days) and monthly views
// ─────────────────────────────────────────────
router.get("/log/history", async (req, res) => {
  try {
    const userId = req.user.id;
    const period = req.query.period; // 'monthly' or undefined
    const days = parseInt(req.query.days) || 30;

    // ─── MONTHLY VIEW ───
    if (period === 'monthly') {
      // Get all logs from the past year (or all logs)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setUTCHours(0, 0, 0, 0);

      const allLogs = await DailyLog.find({
        user: userId,
        date: { $gte: oneYearAgo },
      }).sort({ date: -1 });

      // Group logs by month and get the last day of each month
      const monthlyData = {};
      
      allLogs.forEach(log => {
        const date = new Date(log.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // Keep only the last day (most recent) for each month
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            _id: log._id,
            user: log.user,
            date: log.date,
            waterIntake: log.waterIntake,
            exerciseMinutes: log.exerciseMinutes,
            weight: log.weight,
            mealsLogged: log.mealsLogged,
            createdAt: log.createdAt,
            updatedAt: log.updatedAt,
          };
        }
      });

      // Convert to array and sort by date (most recent first)
      const logs = Object.values(monthlyData)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 12); // Last 12 months

      return res.status(200).json({ success: true, logs });
    }

    // ─── DAILY VIEW (default) ───
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setDate(from.getDate() - days);

    const logs = await DailyLog.find({
      user: userId,
      date: { $gte: from },
    }).sort({ date: 1 });

    res.status(200).json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /progress/log/weekly
//  Returns weekly aggregated data (last 12 weeks)
// ─────────────────────────────────────────────
router.get("/log/weekly", async (req, res) => {
  try {
    const userId = req.user.id;

    // Get logs from the past 12 weeks
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - (12 * 7));
    twelveWeeksAgo.setUTCHours(0, 0, 0, 0);

    const allLogs = await DailyLog.find({
      user: userId,
      date: { $gte: twelveWeeksAgo },
    }).sort({ date: -1 });

    // Group logs by week
    const weeklyData = {};
    
    allLogs.forEach(log => {
      const date = new Date(log.date);
      
      // Calculate week number (ISO week)
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const weekKey = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
      
      // Keep only the last day of each week
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          _id: log._id,
          user: log.user,
          date: log.date,
          waterIntake: log.waterIntake,
          exerciseMinutes: log.exerciseMinutes,
          weight: log.weight,
          mealsLogged: log.mealsLogged,
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
          weekNumber: weekNumber,
        };
      }
    });

    // Convert to array and sort by date
    const logs = Object.values(weeklyData)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 12); // Last 12 weeks

    res.status(200).json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /progress/summary
// ─────────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const userId = req.user.id;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [profile, todayLog, activeDiet, nextAppointment, firstLog, latestLog] = await Promise.all([
      Customer.findOne({ user: userId })
        .select("age gender height currentWeight targetWeight goals allergies")
        .populate("user", "username email"),

      DailyLog.findOne({ user: userId, date: today }),

      DietPlan.findOne({ customerId: userId, status: { $in: ["in progress", "pending"] } })
        .sort({ createdAt: -1 })
        .select("_id status progress startDate endDate meals"),  // ← _id included for meal toggle

      Appointment.findOne({ customerId: userId, status: "booked", date: { $gte: new Date() } })
        .sort({ date: 1 })
        .populate("nutritionistId", "username profilePic"),

      // First ever weight log → original starting weight
      DailyLog.findOne({ user: userId, weight: { $exists: true, $ne: null } })
        .sort({ date: 1 })
        .select("weight"),

      // Latest weight log → most up-to-date current weight
      DailyLog.findOne({ user: userId, weight: { $exists: true, $ne: null } })
        .sort({ date: -1 })
        .select("weight"),
    ]);

    // Use latest logged weight as current, profile weight as fallback
    const currentWeight = latestLog?.weight || profile?.currentWeight;
    // Use first logged weight as original, profile weight as fallback
    const originalWeight = firstLog?.weight || profile?.currentWeight;

    const weightProgress =
      currentWeight && profile?.targetWeight
        ? {
            current: currentWeight,
            target: profile.targetWeight,
            remaining: parseFloat((currentWeight - profile.targetWeight).toFixed(1)),
            original: originalWeight,
          }
        : null;

    const goalsSummary = profile
      ? {
          total: profile.goals.length,
          done: profile.goals.filter((g) => g.status === "done").length,
          pending: profile.goals.filter((g) => g.status === "pending").length,
        }
      : null;

    const todayMeals = activeDiet
      ? activeDiet.meals.filter((m) => {
          const mealDate = new Date(m.date);
          mealDate.setUTCHours(0, 0, 0, 0);
          return mealDate.getTime() === today.getTime();
        })
      : [];

    res.status(200).json({
      success: true,
      summary: {
        profile,
        todayLog: todayLog || {
          waterIntake: 0,
          exerciseMinutes: 0,
          weight: null,
          mealsLogged: false,
        },
        activeDiet: activeDiet
          ? {
              _id: activeDiet._id,          // ← dietId exposed so frontend can toggle meals
              status: activeDiet.status,
              progress: activeDiet.progress,
              startDate: activeDiet.startDate,
              endDate: activeDiet.endDate,
            }
          : null,
        todayMeals,
        weightProgress,
        goalsSummary,
        nextAppointment: nextAppointment || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

module.exports = router;