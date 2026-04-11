const asynchandler = require('express-async-handler')
const Conversation = require('../model/Conversation')
const Message = require('../model/Message')

const sendMessage = asynchandler(async (req, res) => {
  const { recipientId, text } = req.body
  const senderId = req.user.id

  if (!text || !recipientId)
    throw new Error("Recipient ID and text are required")

  // 1. Find an existing conversation between these two users
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, recipientId] }
  })

  // 2. Create it if it doesn't exist
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, recipientId]
    })
  }

  // 3. Create the message
  const newMessage = await Message.create({
    conversationId: conversation._id,
    sender: senderId,
    text: text
  })

  // 4. Update the preview for the sidebar
  conversation.lastMessage = {
    text: text,
    sender: senderId,
    createdAt: new Date()
  }

  await conversation.save()

  res.status(201).json(newMessage)
})

const getConversations = asynchandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user.id
  })
    .populate('participants', 'username profilePic')
    .sort({ updatedAt: -1 })

  res.status(200).json(conversations)
})

const getMessages = asynchandler(async (req, res) => {
  const { conversationId } = req.params

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })

  res.status(200).json(messages)
})

module.exports = { sendMessage, getConversations, getMessages } 