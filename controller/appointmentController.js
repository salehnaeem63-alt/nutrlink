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

const deleteSlot = asyncHandler(async (req, res) => {
    const nutritionistId = req.user.id
    const appointmentId = req.params.id

    const appointment = await Appointment.findById(appointmentId)

    if(!appointment) {
        res.status(404)
        throw new Error('Appointment not found')
    }

    if(appointment.nutritionistId.toString() !== nutritionistId) {
        res.status(401)
        throw new Error('No authorized to delete this slot')
    }
    if(appointment.status === 'booked') {
        res.status(400)
        throw new Error('Cannot delete a booked slot. Cancel it first.')
    }

    await appointment.deleteOne()

    res.json({ message: 'Slot deleted successfully'})
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

const getCustomerAppointments = asyncHandler(async (req, res) => {
    const customerId = req.user.id

    const appointments = await Appointment.find({ customerId, status:'booked'})
    .populate('nutritionistId', 'username email')
    .sort({ date: 1, timeSlot: 1})

    if(appointments.length === 0) {
        return res.json({
            message: "you haven't booked any appointments yet.",
            count: 0,
            appointments: []
        })
    }
    res.json({
        message: 'Customer appointments fetched successfully',
        count: appointments.length,
        appointments
    })
})

const getNutritionistSchedule = asyncHandler( async (req, res) => {
    const nutritionistId = req.user.id
    const { status } = req.query

    const query = { nutritionistId };
    if (status) {
        query.status = status;
    } else {
        query.status = { $ne: 'completed' };
    }
    const schedule = await Appointment.find(query)
    .populate('customerId', 'username email')
    .sort({ date: 1, timeSlot: 1})

    if(schedule.length === 0) {
        return res.json({
            message: "You have no appointments in your schedule.",
            count: 0,
            schedule: []
        })
    }

    res.json({
        message: "Schedule fetched successfully",
        count: schedule.length,
        schedule
    })
})

const cancelAppointment = asyncHandler(async (req, res) => {
    const userId = req.user.id
    const appointmentId = req.params.id

    const appointment = await Appointment.findById(appointmentId)
    
    if(!appointment) {
        res.status(404)
        throw new Error('appointment not found')
    }

    const isCustomer = appointment.customerId && appointment.customerId.toString() === userId;
    const isNutritionist = appointment.nutritionistId.toString() === userId;

    if (!isCustomer && !isNutritionist) {
        res.status(401);
        throw new Error('Not authorized to cancel this appointment');
    }

    appointment.customerId = undefined
    appointment.status = 'available'
    await appointment.save()

    res.json({ message: 'Appointment cancelled successfully'})
    
})

const markCompleted = asyncHandler(async (req, res) => {
    const appointmentId = req.params.id
    const nutritionistId = req.user.id
    const appointment = await Appointment.findById(appointmentId)

    if(!appointment){ 
        res.status(404)
        throw new Error('Appointment not found')
    }

    if(appointment.nutritionistId.toString() !== nutritionistId) {
        res.status(401)
        throw new Error('No authorized to complete this slot')
    }

    if(appointment.status !== 'booked') {
        res.status(400)
        throw new Error('Cannot complete a non booked slot. book one first.')
    }

    appointment.status = 'completed'
    await appointment.save()

    res.json({ message: 'Appointment completed successfully' })
})

const getAppointmentHistory = asyncHandler(async (req, res) => {
    const userId = req.user.id

    const appointment = await Appointment.find({
        $or: [{ customerId: userId}, {nutritionistId: userId}],
        status: 'completed'
    })
    .populate('nutritionistId', 'username email')
    .populate('customerId', 'username email')
    .sort({ date: -1, timeSlot: -1})

    if(appointment.length === 0) {
        return res.json({
            message: "No past history found",
            count: 0,
            appointment: []
        })
    }

    res.json({
        message: 'History fetched successfully',
        count: appointment.length,
        appointment
    })
})

const rescheduleAppointment = asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { currentSlotId, newSlotId } = req.body

    const currentSlot = await Appointment.findById(currentSlotId)
    const newSlot = await Appointment.findById(newSlotId)

    if(!currentSlot || !newSlot) {
        res.status(404)
        throw new Error('Appointment slot not found')
    }

    if(currentSlot.customerId?.toString() !== userId) {
        res.status(401)
        throw new Error('Not authorized to reschedule this appointment')
    }

    if(newSlot.status !== 'available') {
        res.status(400)
        throw new Error('The new time slot is no longer available')
    }

    currentSlot.customerId = undefined
    currentSlot.status = 'available'
    await currentSlot.save()

    newSlot.customerId = userId
    newSlot.status = 'booked'
    await newSlot.save()

    res.json({ message: 'Appointment rescheduled successfully'})
})

const getAllAppointments = asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({})
        .populate('nutritionistId', 'username email')
        .populate('customerId', 'username email')
        .sort({ date: -1, timeSlot: -1 });

    res.json({
        message: 'All system appointments fetched successfully',
        count: appointments.length,
        appointments
    });
});
module.exports = { 
    createSlot, 
    deleteSlot,
    getAvailableSlots, 
    bookAppointment, 
    getCustomerAppointments,
    getNutritionistSchedule,
    cancelAppointment,
    markCompleted,
    getAppointmentHistory,
    rescheduleAppointment,
    getAllAppointments
}