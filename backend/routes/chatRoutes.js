const express = require("express");

const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * User search
 */
router.get(
    "/users/search",
    authMiddleware,
    chatController.searchUsers
);

/*
 * Direct conversations
 */
router.post(
    "/direct",
    authMiddleware,
    chatController.createDirectConversation
);

/*
 * Groups
 */
router.get(
    "/groups/compound",
    authMiddleware,
    chatController.getCompoundGroup
);

router.get(
    "/groups/building/:buildingId",
    authMiddleware,
    chatController.getBuildingGroup
);

/*
 * User conversations
 */
router.get(
    "/conversations",
    authMiddleware,
    chatController.getMyConversations
);

router.get(
    "/conversations/:conversationId",
    authMiddleware,
    chatController.getConversation
);

router.get(
    "/conversations/:conversationId/messages",
    authMiddleware,
    chatController.getMessages
);

router.post(
    "/conversations/:conversationId/messages",
    authMiddleware,
    chatController.sendMessage
);

router.patch(
    "/conversations/:conversationId/read",
    authMiddleware,
    chatController.markMessagesAsRead
);

/*
 * Visitor conversations
 *
 * There is NO public endpoint for generating
 * a Visitor Chat Token anymore.
 *
 * Token generation happens through visitService
 * during the Visit lifecycle.
 */
router.post(
    "/visitor/:visitId/conversation",
    chatController.createVisitorConversation
);

router.get(
    "/visitor/:visitId/conversations/:conversationId/messages",
    chatController.getVisitorMessages
);

router.post(
    "/visitor/:visitId/conversations/:conversationId/messages",
    chatController.sendVisitorMessage
);

router.patch(
    "/visitor/:visitId/conversations/:conversationId/read",
    chatController.markVisitorMessagesAsRead
);

module.exports = router;