const chatService = require("../services/chatService");

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
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

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
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getVisitorMessages = async (req, res) => {
    try {
        const messages =
            await chatService.getVisitorMessages(
                req.params.visitId,
                req.body.token,
                req.params.conversationId
            );

        res.status(200).json({
            success: true,
            messages,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
        res.status(400).json({
            success: false,
            message: error.message,
        });
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
};