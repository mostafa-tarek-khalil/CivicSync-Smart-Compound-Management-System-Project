const chatService = require("../services/chatService");

const handleError = (res, error) => {
    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal server error",
    });
};

// =========================================================
// USER CHAT
// =========================================================

const searchUsers = async (req, res) => {
    try {
        const users = await chatService.searchUsersByPhone(
            req.user.userId,
            req.query.phone
        );

        res.status(200).json({
            success: true,
            users,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const createDirectConversation = async (req, res) => {
    try {
        const conversation =
            await chatService.getOrCreateDirectConversation(
                req.user.userId,
                req.body.receiverId
            );

        res.status(200).json({
            success: true,
            conversation,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const getCompoundGroup = async (req, res) => {
    try {
        const conversation =
            await chatService.getCompoundGroup(
                req.user.userId
            );

        res.status(200).json({
            success: true,
            conversation,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const getBuildingGroup = async (req, res) => {
    try {
        const conversation =
            await chatService.getBuildingGroup(
                req.user.userId,
                req.params.buildingId
            );

        res.status(200).json({
            success: true,
            conversation,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const getMyConversations = async (req, res) => {
    try {
        const conversations =
            await chatService.getMyConversations(
                req.user.userId
            );

        res.status(200).json({
            success: true,
            conversations,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const getConversation = async (req, res) => {
    try {
        const conversation =
            await chatService.getConversationById(
                req.user.userId,
                req.params.conversationId
            );

        res.status(200).json({
            success: true,
            conversation,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const sendMessage = async (req, res) => {
    try {
        const message =
            await chatService.sendUserMessage(
                req.user.userId,
                req.params.conversationId,
                req.body.message
            );

        res.status(201).json({
            success: true,
            message,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const getMessages = async (req, res) => {
    try {
        const messages =
            await chatService.getMessages(
                req.user.userId,
                req.params.conversationId
            );

        res.status(200).json({
            success: true,
            messages,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const markMessagesAsRead = async (req, res) => {
    try {
        const result =
            await chatService.markMessagesAsRead(
                req.user.userId,
                req.params.conversationId
            );

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// =========================================================
// VISITOR CHAT
// =========================================================

const createVisitorConversation = async (req, res) => {
    try {
        const conversation =
            await chatService.getOrCreateVisitorConversation(
                req.params.visitId,
                req.body.token
            );

        res.status(200).json({
            success: true,
            conversation,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const sendVisitorMessage = async (req, res) => {
    try {
        const message =
            await chatService.sendVisitorMessage(
                req.params.visitId,
                req.body.token,
                req.params.conversationId,
                req.body.message
            );

        res.status(201).json({
            success: true,
            message,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const getVisitorMessages = async (req, res) => {
    try {
        const messages =
            await chatService.getVisitorMessages(
                req.params.visitId,
                req.query.token,
                req.params.conversationId
            );

        res.status(200).json({
            success: true,
            messages,
        });
    } catch (error) {
        handleError(res, error);
    }
};

const markVisitorMessagesAsRead = async (req, res) => {
    try {
        const result =
            await chatService.markVisitorMessagesAsRead(
                req.params.visitId,
                req.body.token,
                req.params.conversationId
            );

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// =========================================================
// DELETE MESSAGE FOR ME
// =========================================================

const deleteMessageForMe = async (req, res) => {
    try {
        const result =
            await chatService.deleteMessageForMe(
                req.user.userId,
                req.params.messageId
            );

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// =========================================================
// DELETE MESSAGE FOR EVERYONE
// =========================================================

const deleteMessageForEveryone = async (req, res) => {
    try {
        const result =
            await chatService.deleteMessageForEveryone(
                req.user.userId,
                req.params.messageId
            );

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// =========================================================
// DELETE CONVERSATION FOR ME
// =========================================================

const deleteConversationForMe = async (req, res) => {
    try {
        const result =
            await chatService.deleteConversationForMe(
                req.user.userId,
                req.params.conversationId
            );

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        handleError(res, error);
    }
};

module.exports = {
    searchUsers,
    createDirectConversation,
    getCompoundGroup,
    getBuildingGroup,
    getMyConversations,
    getConversation,
    sendMessage,
    getMessages,
    markMessagesAsRead,

    createVisitorConversation,
    sendVisitorMessage,
    getVisitorMessages,
    markVisitorMessagesAsRead,

    deleteMessageForMe,
    deleteMessageForEveryone,
    deleteConversationForMe,
};