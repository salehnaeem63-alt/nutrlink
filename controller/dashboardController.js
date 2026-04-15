const asyncHandler = require('express-async-handler')
const Nutritionist = require('../model/Nutritionist')
const Appointment = require('../model/Appointment')
const mongoose = require('mongoose')

const getNutritionistDashboard = asyncHandler(async (req, res) => {
    const nutritionistId = req.user.id

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [profile, todayAppointments, thisMonthCount] = await Promise.all([
        Nutritionist.findOne({ user: nutritionistId }),

        Appointment.find({
            nutritionistId,
            status: 'booked',
            date: { $gte: startOfToday, $lte: endOfToday}
        })
        .populate('customerId', 'username profilePic')
        .select('date timeSlot status customerId')
        .sort({ timeSlot: 1}),

        Appointment.countDocuments({
            nutritionistId,
            status: 'completed',
            date: { $gte: startOfMonth }
        })
    ])

    if(!profile) {
        res.status(404)
        throw new Error('Nutritionist profile not found. Please create one first.')
    }

    res.json({
        success: true,
        stats: {
            clientServed: profile.clientServed,
            thisMonthCount: thisMonthCount,
            rating: profile.rating,
            reviewCount: profile.reviewCount,
            yearsOfExperience: profile.yearsOfExperience,
            todayCount: todayAppointments.length
        },
        todayAppointments,
        message: "Dashboard data fetched successfully"
    })
})

const getChartData = asyncHandler(async (req, res) => {
    const nutritionistId = req.user.id
    const currentYear = new Date().getFullYear()

    // 1. Get raw data from MongoDB (Only returns months with data)
    const chartData = await Appointment.aggregate([
        {
            $match: {
                nutritionistId: new mongoose.Types.ObjectId(nutritionistId),
                status: 'completed',
                date: {
                    $gte: new Date(`${currentYear}-01-01`),
                    $lte: new Date(`${currentYear}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: "$date" }, // Returns 1 for Jan, 2 for Feb, etc.
                completedAppointments: { $sum: 1 },
                uniqueCustomersList: { $addToSet: "$customerId" }
            }
        },
        {
            $project: {
                _id: 1,
                completedAppointments: 1,
                uniqueCustomer: { $size: "$uniqueCustomersList" }
            }
        },
        { $sort: { "_id": 1 } }
    ])

    // 2. Map through all 12 months to fill in the "Gaps"
    // Array.from creates [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const fullYearData = Array.from({ length: 12 }, (_, i) => {
        const monthIndex = i + 1;
        
        // Search the box (chartData) for the current month index
        const monthData = chartData.find(m => m._id === monthIndex);

        // If found, return the real data; if not, return the "Zero" version
        return monthData || { 
            _id: monthIndex, 
            completedAppointments: 0, 
            uniqueCustomer: 0 
        };
    });

    // 3. Send the full 12-month package
    res.json({
        success: true,
        data: fullYearData,
        message: "Double-bar chart data fetched successfully"
    })
})

module.exports = {
    getNutritionistDashboard,
    getChartData
}