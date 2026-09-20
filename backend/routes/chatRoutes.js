const express = require("express");

const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =========================================================
// USER CHAT
// =========================================================

// Search users by phone
router.get(
    "/users/search",
    authMiddleware,
    chatController.searchUsers
);

// Create or reuse direct conversation
router.post(
    "/direct",
    authMiddleware,
    chatController.createDirectConversation
);

// Compound group
router.get(
    "/groups/compound",
    authMiddleware,
    chatController.getCompoundGroup
);

// Building group
router.get(
    "/groups/building/:buildingId",
    authMiddleware,
    chatController.getBuildingGroup
);

// My conversations
router.get(
    "/conversations",
    authMiddleware,
    chatController.getMyConversations
);

// Get conversation
router.get(
    "/conversations/:conversationId",
    authMiddleware,
    chatController.getConversation
);

// Get messages
router.get(
    "/conversations/:conversationId/messages",
    authMiddleware,
    chatController.getMessages
);

// Send message
router.post(
    "/conversations/:conversationId/messages",
    authMiddleware,
    chatController.sendMessage
);

// Mark messages as read
router.patch(
    "/conversations/:conversationId/read",
    authMiddleware,
    chatController.markMessagesAsRead
);

// =========================================================
// DELETE
// =========================================================

// Delete message for current user
router.delete(
    "/messages/:messageId/me",
    authMiddleware,
    chatController.deleteMessageForMe
);

// Delete own message for everyone
router.delete(
    "/messages/:messageId/everyone",
    authMiddleware,
    chatController.deleteMessageForEveryone
);

// Delete conversation for current user
router.delete(
    "/conversations/:conversationId/me",
    authMiddleware,
    chatController.deleteConversationForMe
);

// =========================================================
// VISITOR CHAT
// =========================================================

// Create/reuse visitor conversation
router.post(
    "/visitor/:visitId/conversation",
    chatController.createVisitorConversation
);

// Get visitor messages
router.get(
    "/visitor/:visitId/conversations/:conversationId/messages",
    chatController.getVisitorMessages
);

// Send visitor message
router.post(
    "/visitor/:visitId/conversations/:conversationId/messages",
    chatController.sendVisitorMessage
);

// Mark visitor messages as read
router.patch(
    "/visitor/:visitId/conversations/:conversationId/read",
    chatController.markVisitorMessagesAsRead
);

module.exports = router;