const mongoose = require("mongoose");
const DailyLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  mealsLogged: {
    type: Boolean,
    default: false
  },

  waterIntake: {
    type: Number,
    default: 0
  },

  exerciseMinutes: {
    type: Number,
    default: 0
  },

  weight: {
    type: Number
  }

}, { timestamps: true });

module.exports = mongoose.model("DailyLog", DailyLogSchema);