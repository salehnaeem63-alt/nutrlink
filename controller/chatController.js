const asynchandler = require('express-async-handler')
const Conversation = require('../model/Conversation')
const Message = require('../model/Message')
const User = require('../model/User')

const sendMessage = asynchandler(async (req, res) => {
  const { recipientId, text, conversationId } = req.body
  const senderId = req.user.id

  let currentConvId = conversationId

  if (!currentConvId || currentConvId === 'null') {
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] }
    })

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId]
      })
    }
    currentConvId = conversation._id
  }

  const newMessage = await Message.create({
    conversationId: currentConvId,
    sender: senderId,
    text: text
  })

  await Conversation.findByIdAndUpdate(currentConvId, {
    lastMessage: { text, sender: senderId, createdAt: new Date() }
  })

  res.status(201).json({
    newMessage,
    conversationId: currentConvId
  })
})

const deleteMessage = asynchandler(async (req, res) => {
  const { messageId } = req.params;

  // 1. Find the message
  const message = await Message.findById(messageId);

  // 2. Error handling
  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  // 3. Authorization check
  if (message.sender.toString() !== req.user.id) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  // 4. Delete the message from the Database
  await message.deleteOne();

  // 5. Return only the messageId to the frontend
  res.status(200).json({ messageId });
});

const getConversations = asynchandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user.id
  })
    .populate('participants', 'username profilePic lastSeen')
    .sort({ updatedAt: -1 })
    .lean()

  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        sender: { $ne: req.user.id },
        seen: false
      })
      return { ...conv, unreadCount }
    })
  )

  res.status(200).json(conversationsWithUnread)
})

const getMessages = asynchandler(async (req, res) => {
  const { conversationId } = req.params

  await Promise.all([
    Message.updateMany(
      { conversationId, sender: { $ne: req.user.id }, seen: false },
      { $set: { seen: true } }
    ),
    Conversation.findByIdAndUpdate(conversationId, {
      $set: { "lastMessage.seen": true }
    })
  ])

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })

  res.status(200).json(messages)
})

const accessConversation = asynchandler(async (req, res) => {
  const { userId } = req.body

  if (!userId) return res.status(400).send('User ID not provided')

  let chat = await Conversation.findOne({
    participants: { $all: [req.user.id, userId] }
  })
    .populate('participants', 'username profilePic lastSeen')
    .populate('lastMessage')

  if (chat) return res.status(200).json(chat)

  const otherUser = await User.findById(userId).select('username profilePic lastSeen')

  res.status(200).json({
    isGhost: true,
    participants: [req.user, otherUser],
    _id: null
  })
})
module.exports = { sendMessage, deleteMessage, getConversations, getMessages, accessConversation } 