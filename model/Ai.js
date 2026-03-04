const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"], 
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const ChatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    userRole: {
      type: String,
      enum: ["customer", "nutritionist"],
    },

    title: {
      type: String,
      default: "New Chat",
    },

    messages: [MessageSchema],
    context: {
    age: Number,
    gender: String,
    weight: Number,
    height: Number,
    allergies:[String],
    goal: String
  },

  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema);