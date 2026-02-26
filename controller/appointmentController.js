const asyncHandler = require('express-async-handler')
const Appointment = require('../model/Appointment')

const createSlot = asyncHandler(async (req,res) => {
    const nutritionistId = req.user.id
    const { date, timeSlot } = req.body

    const slotExists = await Appointment.findOne({ nutritionistId, date, timeSlot })

    if(slotExists) {
        res.status(400)
        throw new Error('This time slot already exists for this date.')
    }

    const newSlot = await Appointment.create({
        nutritionistId, date, timeSlot, status: 'available'
    });

    res.status(201)
    .json({
        message: 'Available time slot created successfully',
        slot: newSlot 
    })
})

const getAvailableSlots = asyncHandler(async (req,res) => {
    const { nutritionistId } = req.params

    const slots = await Appointment.find({ nutritionistId: nutritionistId, status: 'available'})
    .populate('nutritionistId', 'username email')
    .sort({ date: 1, timeSlot: 1 })

    res.json({
        message: 'Available slot fetched successfully',
        count: slots.length,
        slots
    })
})

const bookAppointment = asyncHandler(async (req, res) => {
    const customerId = req.user.id
    const appointmentId = req.params.id

    const book = await Appointment.findById(appointmentId)

    if(!book) {
        res.status(404)
        throw new Error('Appointment not found')
    }

    if(book.status !== 'available') {
        res.status(400)
        throw new Error('This time slot is no longer available')
    }

    book.customerId = customerId
    book.status = 'booked'
    await book.save()
    res.json({ message: 'done' })
})



module.exports = { createSlot, getAvailableSlots, bookAppointment }