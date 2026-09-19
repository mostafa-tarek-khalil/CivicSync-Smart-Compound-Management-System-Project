const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Conversation = require("../models/conversation");

const chatService = require("../services/chatService");

/*
 * Authenticate normal User
 */
const authenticateUserSocket = async (socket, next) => {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace(
                "Bearer ",
                ""
            );

        if (!token) {
            return next(
                new Error("Authentication token is required")
            );
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.userId);

        if (!user) {
            return next(
                new Error("User not found")
            );
        }

        if (user.status !== "ACTIVE") {
            return next(
                new Error("Account is not active")
            );
        }

        socket.authType = "USER";

        socket.user = {
            userId: user._id.toString(),
            role: user.role,
        };

        next();
    } catch (error) {
        console.error(
            "User socket authentication error:",
            error
        );

        return next(
            new Error("Invalid or expired user token")
        );
    }
};

/*
 * Authenticate Visitor
 */
const authenticateVisitorSocket = async (
    socket,
    next
) => {
    try {
        const visitorChatToken =
            socket.handshake.auth?.visitorChatToken;

        const visitId =
            socket.handshake.auth?.visitId;

        if (!visitorChatToken) {
            return next(
                new Error(
                    "Visitor chat token is required"
                )
            );
        }

        if (!visitId) {
            return next(
                new Error("Visit ID is required")
            );
        }

        const visit =
            await chatService.verifyVisitorChatToken(
                visitId,
                visitorChatToken
            );

        socket.authType = "VISITOR";

        socket.visitor = {
            visitId: visit._id.toString(),
            residentId: visit.residentId.toString(),
            visitorName: visit.visitorName,
            chatToken: visitorChatToken,
        };

        next();
    } catch (error) {
        console.error(
            "Visitor socket authentication error:",
            error
        );

        return next(
            new Error(error.message)
        );
    }
};

/*
 * Socket Authentication
 */
const authenticateSocket = async (socket, next) => {
    const auth = socket.handshake.auth || {};

    /*
     * Visitor authentication
     */
    if (auth.visitorChatToken) {
        return authenticateVisitorSocket(
            socket,
            next
        );
    }

    /*
     * Normal User authentication
     */
    return authenticateUserSocket(
        socket,
        next
    );
};

const initializeChatSocket = (io) => {
    io.use(authenticateSocket);

    io.on("connection", (socket) => {

        /*
         * Connection log
         */
        if (socket.authType === "USER") {
            console.log(
                `Chat socket connected: ${socket.id} | User: ${socket.user.userId}`
            );
        } else {
            console.log(
                `Visitor chat socket connected: ${socket.id} | Visit: ${socket.visitor.visitId}`
            );
        }


        /*
         * Join conversation
         */
        socket.on(
            "conversation:join",
            async (conversationId) => {
                try {
                    if (!conversationId) {
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


                    /*
                     * User authorization
                     */
                    if (
                        socket.authType ===
                        "USER"
                    ) {
                        await chatService.getConversationById(
                            socket.user.userId,
                            conversationId
                        );
                    }


                    /*
                     * Visitor authorization
                     */
                    if (
                        socket.authType ===
                        "VISITOR"
                    ) {
                        const conversation =
                            await Conversation.findOne({
                                _id: conversationId,
                                type: "VISITOR",
                                relatedVisitId:
                                    socket.visitor.visitId,
                            });

                        if (!conversation) {
                            throw new Error(
                                "You are not allowed to access this visitor conversation"
                            );
                        }
                    }


                    socket.join(room);

                    console.log(
                        `Socket ${socket.id} joined ${room}`
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
                            message: error.message,
                        }
                    );

                }
            }
        );


        /*
         * Leave conversation
         */
        socket.on(
            "conversation:leave",
            (conversationId) => {

                if (!conversationId) {
                    return;
                }

                const room =
                    `conversation:${conversationId}`;

                socket.leave(room);

                console.log(
                    `Socket ${socket.id} left ${room}`
                );

                socket.emit(
                    "conversation:left",
                    {
                        conversationId,
                    }
                );

            }
        );


        /*
         * Send User message
         */
        socket.on(
            "message:send",
            async ({ conversationId, message }) => {

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


                    if (!conversationId) {
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


                    const room =
                        `conversation:${conversationId}`;


                    io.to(room).emit(
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


        /*
         * Send Visitor message
         */
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


                    if (!conversationId) {
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


                    const room =
                        `conversation:${conversationId}`;


                    io.to(room).emit(
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


        /*
         * Mark User conversation as read
         */
        socket.on(
            "conversation:read",
            async (conversationId) => {

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


                    if (!conversationId) {
                        return socket.emit(
                            "chat:error",
                            {
                                message:
                                    "Conversation ID is required",
                            }
                        );
                    }


                    const result =
                        await chatService.markMessagesAsRead(
                            socket.user.userId,
                            conversationId
                        );


                    const room =
                        `conversation:${conversationId}`;


                    io.to(room).emit(
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


        /*
         * Disconnect
         */
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

    });
};

module.exports = initializeChatSocket;