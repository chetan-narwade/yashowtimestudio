const mongoose = require("mongoose");
 
const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
 
const chatSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    default: "guest"
  },
  messages: [messageSchema],
 
  // metadata for analytics / training
  topic: { type: String, default: "" },          // auto-detected topic label
  messageCount: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  createdAt:  { type: Date, default: Date.now }
});
 
// update lastActive + messageCount on save
chatSchema.pre("save", function (next) {
  this.lastActive   = new Date();
  this.messageCount = this.messages.length;
  next();
});
 
module.exports = mongoose.model("Chat", chatSchema);