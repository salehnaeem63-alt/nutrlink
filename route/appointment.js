const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')
const cusValidation = require('../middleware/cusValidation')
const nutriValidation = require('../middleware/nutriValidation')

const { createSlot, getAvailableSlots, bookAppointment } = require('../controller/appointmentController')

router.post('/', authToken, createSlot)
router.get('/:nutritionistId', authToken, getAvailableSlots)
router.put('/book/:id', authToken, cusValidation, bookAppointment)
module.exports = router;