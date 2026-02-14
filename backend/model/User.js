const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['customer', 'nutritionist'],
        required: true
    },
    isadmin: {
        type: Boolean,
        default: false
    },
    profilePic: {
        type: String,
default: "https://static.vecteezy.com/system/resources/previews/026/434/417/original/default-avatar-profile-icon-of-social-media-user-photo-vector.jpg"    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);