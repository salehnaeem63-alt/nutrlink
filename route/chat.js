const express = require('express');
const router = express.Router();
const authToken = require('../middleware/verifyToken');
const { 
    sendMessage, 
    getConversations, 
    getMessages 
} = require('../controller/chatController');

// 1. Apply middleware to ALL routes below this line
router.use(authToken);

// 2. Define your routes (now automatically protected)
router.post('/send', sendMessage);
router.get('/conversations', getConversations);
router.get('/messages/:conversationId', getMessages);

module.exports = router;