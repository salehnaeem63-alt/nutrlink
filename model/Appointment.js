const mongoose = require('mongoose')

const appointments = new mongoose.Schema({
    nutritionistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'booked', 'cancelled', 'completed'],
        default: 'available'
    },
    notes: {
        type: String,
        maxlength: [200, 'Notes cannot exceed 200 charcacters']
    }
}, { timestamps: true });

appointments.index({ nutritionistId: 1, date: 1, timeSlot: 1}, {unique: true})

module.exports = mongoose.model('Appointments', appointments)