const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Portfolio",  // ✅ fixed: was "Service"
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending"
  },

  amount: {
    type: Number,
    required: true
  },

  sessionId: {
    type: String
  },

  paymentIntentId: {
    type: String
  }

}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);