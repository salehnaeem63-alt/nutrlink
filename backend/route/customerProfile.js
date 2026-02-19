const express = require('express')
const router = express.Router()
const authToken = require('../middleware/verifyToken')

const { createProfile, getProfile, updateProfile } = require('../controller/profileController')

router.post('/', authToken, createProfile)
router.get('/', authToken, getProfile)
router.put('/', authToken, updateProfile)

module.exports = router