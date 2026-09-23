const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Conversation = require("../models/conversation");

const chatService = require("../services/chatService");
const notificationService = require("../services/notificationService");

// =========================================================
// USER SOCKET AUTH
// =========================================================

const authenticateUserSocket = async (
    socket,
    next
) => {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace(
                "Bearer ",
                ""
            );

        if (!token) {
            return next(
                new Error(
                    "Authentication token is required"
                )
            );
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        const user =
            await User.findById(
                decoded.userId
            );

        if (!user) {
            return next(
                new Error(
                    "User not found"
                )
            );
        }

        if (
            user.status !==
            "ACTIVE"
        ) {
            return next(
                new Error(
                    "Account is not active"
                )
            );
        }

        socket.authType =
            "USER";

        socket.user = {
            userId:
                user._id.toString(),

            role:
                user.role,
        };

        next();
    } catch (error) {
        console.error(
            "User socket authentication error:",
            error
        );

        return next(
            new Error(
                "Invalid or expired user token"
            )
        );
    }
};

// =========================================================
// VISITOR SOCKET AUTH
// =========================================================

const authenticateVisitorSocket =
    async (
        socket,
        next
    ) => {
        try {
            const visitorChatToken =
                socket.handshake
                    .auth
                    ?.visitorChatToken;

            const visitId =
                socket.handshake
                    .auth
                    ?.visitId;

            if (!visitorChatToken) {
                return next(
                    new Error(
                        "Visitor chat token is required"
                    )
                );
            }

            if (!visitId) {
                return next(
                    new Error(
                        "Visit ID is required"
                    )
                );
            }

            const visit =
                await chatService.verifyVisitorChatToken(
                    visitId,
                    visitorChatToken
                );

            socket.authType =
                "VISITOR";

            socket.visitor = {
                visitId:
                    visit._id.toString(),

                residentId:
                    visit.residentId.toString(),

                visitorName:
                    visit.visitorName,

                chatToken:
                    visitorChatToken,
            };

            next();
        } catch (error) {
            console.error(
                "Visitor socket authentication error:",
                error
            );

            return next(
                new Error(
                    error.message
                )
            );
        }
    };

// =========================================================
// GENERAL AUTH
// =========================================================

const authenticateSocket =
    async (
        socket,
        next
    ) => {
        const auth =
            socket.handshake.auth ||
            {};

        if (
            auth.visitorChatToken
        ) {
            return authenticateVisitorSocket(
                socket,
                next
            );
        }

        return authenticateUserSocket(
            socket,
            next
        );
    };

// =========================================================
// INITIALIZE SOCKET
// =========================================================

const initializeChatSocket = (
    io
) => {
    notificationService.setSocketServer(io);

    io.use(
        authenticateSocket
    );

    io.on(
        "connection",
        (socket) => {
            if (
                socket.authType ===
                "USER"
            ) {
                socket.join(`user:${socket.user.userId}`);
                console.log(
                    `Chat socket connected: ${socket.id} | User: ${socket.user.userId}`
                );
            } else {
                console.log(
                    `Visitor chat socket connected: ${socket.id} | Visit: ${socket.visitor.visitId}`
                );
            }

            // =====================================================
            // JOIN CONVERSATION
            // =====================================================

            socket.on(
                "conversation:join",
                async (
                    conversationId
                ) => {
                    try {
                        if (
                            !conversationId
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Conversation ID is required",
                                }
                            );
                        }

                        const room =
                            `conversation:${conversationId}`;

                        if (
                            socket.authType ===
                            "USER"
                        ) {
                            await chatService.getConversationById(
                                socket.user.userId,
                                conversationId
                            );
                        }

                        if (
                            socket.authType ===
                            "VISITOR"
                        ) {
                            const conversation =
                                await Conversation.findOne(
                                    {
                                        _id:
                                            conversationId,

                                        type:
                                            "VISITOR",

                                        relatedVisitId:
                                            socket.visitor.visitId,
                                    }
                                );

                            if (
                                !conversation
                            ) {
                                throw new Error(
                                    "You are not allowed to access this visitor conversation"
                                );
                            }
                        }

                        socket.join(
                            room
                        );

                        socket.emit(
                            "conversation:joined",
                            {
                                conversationId,
                            }
                        );
                    } catch (error) {
                        socket.emit(
                            "chat:error",
                            {
                                message:
                                    error.message,
                            }
                        );
                    }
                }
            );

            // =====================================================
            // LEAVE CONVERSATION
            // =====================================================

            socket.on(
                "conversation:leave",
                (
                    conversationId
                ) => {
                    if (
                        !conversationId
                    ) {
                        return;
                    }

                    socket.leave(
                        `conversation:${conversationId}`
                    );

                    socket.emit(
                        "conversation:left",
                        {
                            conversationId,
                        }
                    );
                }
            );

            // =====================================================
            // SEND USER MESSAGE
            // =====================================================

            socket.on(
                "message:send",
                async ({
                    conversationId,
                    message,
                }) => {
                    try {
                        if (
                            socket.authType !==
                            "USER"
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Visitor must use visitor:message:send",
                                }
                            );
                        }

                        if (
                            !conversationId
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Conversation ID is required",
                                }
                            );
                        }

                        if (
                            !message ||
                            typeof message !==
                                "string" ||
                            !message.trim()
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Message is required",
                                }
                            );
                        }

                        const newMessage =
                            await chatService.sendUserMessage(
                                socket.user.userId,
                                conversationId,
                                message.trim()
                            );

                        io.to(
                            `conversation:${conversationId}`
                        ).emit(
                            "message:new",
                            {
                                message:
                                    newMessage,
                            }
                        );
                    } catch (error) {
                        socket.emit(
                            "chat:error",
                            {
                                message:
                                    error.message,
                            }
                        );
                    }
                }
            );

            // =====================================================
            // SEND VISITOR MESSAGE
            // =====================================================

            socket.on(
                "visitor:message:send",
                async ({
                    conversationId,
                    message,
                }) => {
                    try {
                        if (
                            socket.authType !==
                            "VISITOR"
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Only visitors can use visitor:message:send",
                                }
                            );
                        }

                        if (
                            !conversationId
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Conversation ID is required",
                                }
                            );
                        }

                        if (
                            !message ||
                            typeof message !==
                                "string" ||
                            !message.trim()
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Message is required",
                                }
                            );
                        }

                        const newMessage =
                            await chatService.sendVisitorMessage(
                                socket.visitor.visitId,
                                socket.visitor.chatToken,
                                conversationId,
                                message.trim()
                            );

                        io.to(
                            `conversation:${conversationId}`
                        ).emit(
                            "message:new",
                            {
                                message:
                                    newMessage,
                            }
                        );
                    } catch (error) {
                        socket.emit(
                            "chat:error",
                            {
                                message:
                                    error.message,
                            }
                        );
                    }
                }
            );

            // =====================================================
            // MARK AS READ
            // =====================================================

            socket.on(
                "conversation:read",
                async (
                    conversationId
                ) => {
                    try {
                        if (
                            socket.authType !==
                            "USER"
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Only users can mark messages as read",
                                }
                            );
                        }

                        const result =
                            await chatService.markMessagesAsRead(
                                socket.user.userId,
                                conversationId
                            );

                        io.to(
                            `conversation:${conversationId}`
                        ).emit(
                            "messages:read",
                            {
                                conversationId,

                                userId:
                                    socket.user.userId,

                                ...result,
                            }
                        );
                    } catch (error) {
                        socket.emit(
                            "chat:error",
                            {
                                message:
                                    error.message,
                            }
                        );
                    }
                }
            );

            // =====================================================
            // DELETE MESSAGE FOR ME
            // =====================================================

            socket.on(
                "message:delete:me",
                async ({
                    messageId,
                }) => {
                    try {
                        if (
                            socket.authType !==
                            "USER"
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Only users can delete messages",
                                }
                            );
                        }

                        if (
                            !messageId
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Message ID is required",
                                }
                            );
                        }

                        const result =
                            await chatService.deleteMessageForMe(
                                socket.user.userId,
                                messageId
                            );

                        // Only the current socket gets this event.
                        socket.emit(
                            "message:deletedForMe",
                            {
                                messageId:
                                    result.messageId,

                                conversationId:
                                    result.conversationId,
                            }
                        );
                    } catch (error) {
                        socket.emit(
                            "chat:error",
                            {
                                message:
                                    error.message,
                            }
                        );
                    }
                }
            );

            // =====================================================
            // DELETE MESSAGE FOR EVERYONE
            // =====================================================

            socket.on(
                "message:delete:everyone",
                async ({
                    messageId,
                }) => {
                    try {
                        if (
                            socket.authType !==
                            "USER"
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Only users can delete messages",
                                }
                            );
                        }

                        if (
                            !messageId
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Message ID is required",
                                }
                            );
                        }

                        const result =
                            await chatService.deleteMessageForEveryone(
                                socket.user.userId,
                                messageId
                            );

                        io.to(
                            `conversation:${result.conversationId}`
                        ).emit(
                            "message:deleted",
                            {
                                messageId:
                                    result.messageId,

                                conversationId:
                                    result.conversationId,

                                message:
                                    "This message was deleted",
                            }
                        );
                    } catch (error) {
                        socket.emit(
                            "chat:error",
                            {
                                message:
                                    error.message,
                            }
                        );
                    }
                }
            );

            // =====================================================
            // DELETE CONVERSATION FOR ME
            // =====================================================

            socket.on(
                "conversation:delete:me",
                async (
                    conversationId
                ) => {
                    try {
                        if (
                            socket.authType !==
                            "USER"
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Only users can delete conversations",
                                }
                            );
                        }

                        if (
                            !conversationId
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    message:
                                        "Conversation ID is required",
                                }
                            );
                        }

                        const result =
                            await chatService.deleteConversationForMe(
                                socket.user.userId,
                                conversationId
                            );

                        socket.emit(
                            "conversation:deleted",
                            {
                                conversationId:
                                    result.conversationId,
                            }
                        );

                        socket.leave(
                            `conversation:${conversationId}`
                        );
                    } catch (error) {
                        socket.emit(
                            "chat:error",
                            {
                                message:
                                    error.message,
                            }
                        );
                    }
                }
            );

            // =====================================================
            // DISCONNECT
            // =====================================================

            socket.on(
                "disconnect",
                (reason) => {
                    if (
                        socket.authType ===
                        "USER"
                    ) {
                        console.log(
                            `Chat socket disconnected: ${socket.id} | User: ${socket.user.userId} | Reason: ${reason}`
                        );
                    } else {
                        console.log(
                            `Visitor chat socket disconnected: ${socket.id} | Visit: ${socket.visitor.visitId} | Reason: ${reason}`
                        );
                    }
                }
            );
        }
    );
};

module.exports =
    initializeChatSocket;
