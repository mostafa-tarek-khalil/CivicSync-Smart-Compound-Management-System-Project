const express = require("express");

const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/users/search", authMiddleware, chatController.searchUsers);
router.post("/direct", authMiddleware, chatController.createDirectConversation);
router.get("/groups/compound", authMiddleware, chatController.getCompoundGroup);
router.get("/groups/building/:buildingId", authMiddleware, chatController.getBuildingGroup);
router.get("/conversations", authMiddleware, chatController.getMyConversations);
router.get("/conversations/:conversationId", authMiddleware, chatController.getConversation);
router.get("/conversations/:conversationId/messages", authMiddleware, chatController.getMessages);
router.post("/conversations/:conversationId/messages", authMiddleware, chatController.sendMessage);
router.patch("/conversations/:conversationId/read", authMiddleware, chatController.markMessagesAsRead);
router.post("/visitor/:visitId/conversation", chatController.createVisitorConversation);
router.get("/visitor/:visitId/conversations/:conversationId/messages", chatController.getVisitorMessages);
router.post("/visitor/:visitId/conversations/:conversationId/messages", chatController.sendVisitorMessage);
router.patch("/visitor/:visitId/conversations/:conversationId/read", chatController.markVisitorMessagesAsRead);

module.exports = router;