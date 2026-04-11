const express = require('express');
const router = express.Router();
const authToken = require('../middleware/verifyToken');
const {
    sendMessage,
    deleteMessage,
    getConversations,
    getMessages,
    accessConversation
} = require('../controller/chatController');

// 1. Apply middleware to ALL routes below this line
router.use(authToken);

router.post('/', accessConversation)

// 2. Define your routes (now automatically protected)
router.post('/send', sendMessage);
router.delete('/messages/:messageId', deleteMessage)
router.get('/conversations', getConversations);
router.get('/messages/:conversationId', getMessages);

module.exports = router;