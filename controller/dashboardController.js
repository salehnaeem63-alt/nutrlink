const asyncHandler = require('express-async-handler')
const Nutritionist = require('../model/Nutritionist')
const Appointment = require('../model/Appointment')
const mongoose = require('mongoose')

const getNutritionistDashboard = asyncHandler(async (req, res) => {
    const nutritionistId = req.user.id

    const [profile, upcomingAppointments] = await Promise.all([
        Nutritionist.findOne({ user: nutritionistId }),
        Appointment.find({ nutritionistId, status: 'booked'})
        .populate('customerId', 'username profilePic')
        .select('date timeSlot status customerId')
        .sort({ date: 1, timeSlot: 1 })
        .limit(5)
    ])

    if(!profile) {
        res.status(404)
        throw new Error('Nutritionist profile not found. Please create one first.')
    }

    res.json({
        success: true,
        stats: {
            clientServed: profile.clientServed,
            rating: profile.rating,
            reviewCount: profile.reviewCount,
            yearsOfExperience: profile.yearsOfExperience
        },
        upcomingAppointments,
        message: "Dashboard data fetched successfully"
    })
})

const getChartData = asyncHandler(async (req, res) => {
    const nutritionistId = req.user.id
    const currentYear = new Date().getFullYear()

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
                _id: { $month: "$date" },
                completedAppointments: { $sum: 1},
                uniqueCustomersList: { $addToSet: "$customerId"}
            }
        },
        {
            $project: {
                _id: 1,
                completedAppointments: 1,
                uniqueCustomer : { $size: "$uniqueCustomersList" }
            }
        },
        { $sort: { "_id": 1}}
    ])

    res.json({
        success: true,
        data: chartData,
        message: "Double-bar chart data fetched successfully"
    })
})

const todayAppointments = asyncHandler(async (req, res) => {
    const nutritionistId = req.user.id

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 59)
})

module.exports = {
    getNutritionistDashboard,
    getChartData
}