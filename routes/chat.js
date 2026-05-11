const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/chat");

// Send message (with sessionId + history)
router.post("/chat", controller.chatWithAI);

// Load previous messages for a session
router.get("/chat/history/:sessionId", controller.getChatHistory);

// Clear a session's history
router.delete("/chat/history/:sessionId", controller.clearChatHistory);

module.exports = router;