const mongoose = require("mongoose");
const crypto = require("crypto");

const Conversation = require("../models/conversation");
const Message = require("../models/message");
const User = require("../models/user");
const Unit = require("../models/unit");
const Building = require("../models/building");
const Visit = require("../models/visit");
const MaintenanceTicket = require("../models/maintenanceTicket");

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// =========================================================
// USER HELPERS
// =========================================================

const getActiveUserById = async (userId) => {
    if (!isValidObjectId(userId)) {
        const error = new Error("Invalid user ID");
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findById(userId).select(
        "_id name email phone role status unitId profileImage"
    );

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    if (user.status !== "ACTIVE") {
        const error = new Error("User is not active");
        error.statusCode = 403;
        throw error;
    }

    return user;
};

// =========================================================
// SEARCH USERS
// =========================================================

const searchUsersByPhone = async (userId, phone) => {
    await getActiveUserById(userId);

    if (!phone || typeof phone !== "string") {
        const error = new Error("Phone number is required");
        error.statusCode = 400;
        throw error;
    }

    const searchPhone = phone.trim();

    const users = await User.find({
        phone: {
            $regex: `^${searchPhone}`,
        },
        status: "ACTIVE",
        _id: {
            $ne: userId,
        },
    }).select(
        "_id name phone role unitId profileImage"
    );

    return users;
};

// =========================================================
// DIRECT CHAT PERMISSIONS
// =========================================================

const canResidentAndTechnicianChat = async (
    residentId,
    technicianId
) => {
    const ticket = await MaintenanceTicket.findOne({
        residentId,
        assignedTo: technicianId,
    }).select("_id");

    return !!ticket;
};

const canDirectChat = async (sender, receiver) => {
    if (sender._id.equals(receiver._id)) {
        return false;
    }

    if (
        sender.status !== "ACTIVE" ||
        receiver.status !== "ACTIVE"
    ) {
        return false;
    }

    // Admin can chat with everyone.
    if (
        sender.role === "ADMIN" ||
        receiver.role === "ADMIN"
    ) {
        return true;
    }

    // Resident
    if (sender.role === "RESIDENT") {
        if (
            receiver.role === "RESIDENT" ||
            receiver.role === "SECURITY"
        ) {
            return true;
        }

        if (receiver.role === "TECHNICIAN") {
            return canResidentAndTechnicianChat(
                sender._id,
                receiver._id
            );
        }

        return false;
    }

    // Security -> Resident
    if (sender.role === "SECURITY") {
        return receiver.role === "RESIDENT";
    }

    // Technician -> Resident
    if (sender.role === "TECHNICIAN") {
        if (receiver.role !== "RESIDENT") {
            return false;
        }

        return canResidentAndTechnicianChat(
            receiver._id,
            sender._id
        );
    }

    return false;
};

// =========================================================
// CREATE / REUSE DIRECT CHAT
// =========================================================

const getOrCreateDirectConversation = async (
    senderId,
    receiverId
) => {
    if (!isValidObjectId(receiverId)) {
        const error = new Error("Invalid receiver ID");
        error.statusCode = 400;
        throw error;
    }

    const sender = await getActiveUserById(senderId);
    const receiver = await getActiveUserById(receiverId);

    const allowed = await canDirectChat(
        sender,
        receiver
    );

    if (!allowed) {
        const error = new Error(
            "You are not allowed to chat with this user"
        );

        error.statusCode = 403;
        throw error;
    }

    const participants = [
        sender._id,
        receiver._id,
    ].sort((a, b) =>
        a.toString().localeCompare(b.toString())
    );

    let conversation =
        await Conversation.findOne({
            type: "DIRECT",
            participants: {
                $all: participants,
                $size: 2,
            },
        });

    if (!conversation) {
        conversation = await Conversation.create({
            type: "DIRECT",
            participants,
        });
    } else {
        // Only restore visibility for the user opening
        // the conversation.
        conversation.deletedFor =
            conversation.deletedFor.filter(
                (userId) =>
                    userId.toString() !==
                    sender._id.toString()
            );

        await conversation.save();
    }

    return conversation;
};

// =========================================================
// COMPOUND GROUP
// =========================================================

const getCompoundGroup = async (userId) => {
    const user = await getActiveUserById(userId);

    if (
        !["RESIDENT", "SECURITY", "ADMIN"].includes(
            user.role
        )
    ) {
        const error = new Error(
            "You are not allowed to access the compound group"
        );

        error.statusCode = 403;
        throw error;
    }

    const participants = await User.find({
        role: {
            $in: [
                "RESIDENT",
                "SECURITY",
                "ADMIN",
            ],
        },
        status: "ACTIVE",
    }).select("_id");

    const participantIds = participants.map(
        (participant) => participant._id
    );

    let conversation =
        await Conversation.findOne({
            type: "GROUP",
            groupType: "COMPOUND",
        });

    if (!conversation) {
        conversation =
            await Conversation.create({
                type: "GROUP",
                groupType: "COMPOUND",
                participants: participantIds,
            });
    } else {
        conversation.participants = participantIds;

        conversation.deletedFor =
            conversation.deletedFor.filter(
                (id) =>
                    id.toString() !==
                    userId.toString()
            );

        await conversation.save();
    }

    return conversation;
};

// =========================================================
// BUILDING GROUP
// =========================================================

const getBuildingGroup = async (
    userId,
    buildingId
) => {
    const user = await getActiveUserById(userId);

    if (
        !["RESIDENT", "SECURITY", "ADMIN"].includes(
            user.role
        )
    ) {
        const error = new Error(
            "You are not allowed to access building groups"
        );

        error.statusCode = 403;
        throw error;
    }

    if (!isValidObjectId(buildingId)) {
        const error = new Error(
            "Invalid building ID"
        );

        error.statusCode = 400;
        throw error;
    }

    const buildingExists = await Building.exists({
        _id: buildingId,
    });

    if (!buildingExists) {
        const error = new Error(
            "Building not found"
        );

        error.statusCode = 404;
        throw error;
    }

    if (user.role === "RESIDENT") {
        if (!user.unitId) {
            const error = new Error(
                "Resident is not assigned to a unit"
            );

            error.statusCode = 400;
            throw error;
        }

        const residentUnit =
            await Unit.findById(
                user.unitId
            ).select("buildingId");

        if (!residentUnit) {
            const error = new Error(
                "Resident unit not found"
            );

            error.statusCode = 404;
            throw error;
        }

        if (
            residentUnit.buildingId.toString() !==
            buildingId.toString()
        ) {
            const error = new Error(
                "You can only access your building group"
            );

            error.statusCode = 403;
            throw error;
        }
    }

    const units = await Unit.find({
        buildingId,
    }).select("_id");

    const unitIds = units.map(
        (unit) => unit._id
    );

    const residents = await User.find({
        role: "RESIDENT",
        status: "ACTIVE",
        unitId: {
            $in: unitIds,
        },
    }).select("_id");

    const securityAndAdmins =
        await User.find({
            role: {
                $in: [
                    "SECURITY",
                    "ADMIN",
                ],
            },
            status: "ACTIVE",
        }).select("_id");

    const participantIds = [
        ...residents.map(
            (resident) => resident._id
        ),
        ...securityAndAdmins.map(
            (member) => member._id
        ),
    ];

    let conversation =
        await Conversation.findOne({
            type: "GROUP",
            groupType: "BUILDING",
            buildingId,
        });

    if (!conversation) {
        conversation =
            await Conversation.create({
                type: "GROUP",
                groupType: "BUILDING",
                buildingId,
                participants: participantIds,
            });
    } else {
        conversation.participants =
            participantIds;

        conversation.deletedFor =
            conversation.deletedFor.filter(
                (id) =>
                    id.toString() !==
                    userId.toString()
            );

        await conversation.save();
    }

    return conversation;
};

// =========================================================
// VISITOR TOKEN
// =========================================================

const verifyVisitorChatToken = async (
    visitId,
    token
) => {
    if (!isValidObjectId(visitId)) {
        const error = new Error(
            "Invalid visit ID"
        );

        error.statusCode = 400;
        throw error;
    }

    if (
        !token ||
        typeof token !== "string"
    ) {
        const error = new Error(
            "Visitor chat token is required"
        );

        error.statusCode = 401;
        throw error;
    }

    const visit =
        await Visit.findById(
            visitId
        ).select("+visitorChatTokenHash");

    if (!visit) {
        const error = new Error(
            "Visit not found"
        );

        error.statusCode = 404;
        throw error;
    }

    if (!visit.visitorChatTokenHash) {
        const error = new Error(
            "Visitor chat is not initialized"
        );

        error.statusCode = 403;
        throw error;
    }

    if (
        !visit.visitorChatTokenExpiresAt ||
        visit.visitorChatTokenExpiresAt <
            new Date()
    ) {
        const error = new Error(
            "Visitor chat token has expired"
        );

        error.statusCode = 401;
        throw error;
    }

    if (
        ![
            "APPROVED",
            "QR_GENERATED",
            "CHECKED_IN",
        ].includes(visit.status)
    ) {
        const error = new Error(
            "Chat is not available for this visit"
        );

        error.statusCode = 403;
        throw error;
    }

    const tokenHash =
        crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

    if (
        tokenHash !==
        visit.visitorChatTokenHash
    ) {
        const error = new Error(
            "Invalid visitor chat token"
        );

        error.statusCode = 401;
        throw error;
    }

    return visit;
};

// =========================================================
// VISITOR CONVERSATION
// =========================================================

const getOrCreateVisitorConversation =
    async (
        visitId,
        token
    ) => {
        const visit =
            await verifyVisitorChatToken(
                visitId,
                token
            );

        let conversation =
            await Conversation.findOne({
                type: "VISITOR",
                relatedVisitId: visit._id,
            });

        if (!conversation) {
            try {
                conversation =
                    await Conversation.create({
                        type: "VISITOR",
                        relatedVisitId:
                            visit._id,
                        participants: [
                            visit.residentId,
                        ],
                    });
            } catch (error) {
                if (error.code === 11000) {
                    conversation =
                        await Conversation.findOne(
                            {
                                type: "VISITOR",
                                relatedVisitId:
                                    visit._id,
                            }
                        );
                } else {
                    throw error;
                }
            }
        }

        return conversation;
    };

// =========================================================
// UNREAD COUNT
// =========================================================

const getUnreadCount = async (
    userId,
    conversation
) => {
    if (
        conversation.type ===
        "VISITOR"
    ) {
        return Message.countDocuments({
            conversationId:
                conversation._id,

            senderType: "VISITOR",

            isRead: false,

            deletedFor: {
                $ne: userId,
            },

            isDeleted: false,
        });
    }

    if (
        conversation.type ===
        "GROUP"
    ) {
        return Message.countDocuments({
            conversationId:
                conversation._id,

            senderId: {
                $ne: userId,
            },

            readBy: {
                $ne: userId,
            },

            deletedFor: {
                $ne: userId,
            },

            isDeleted: false,
        });
    }

    return Message.countDocuments({
        conversationId:
            conversation._id,

        senderId: {
            $ne: userId,
        },

        isRead: false,

        deletedFor: {
            $ne: userId,
        },

        isDeleted: false,
    });
};

// =========================================================
// GET MY CONVERSATIONS
// =========================================================

const getMyConversations = async (
    userId
) => {
    await getActiveUserById(userId);

    const conversations =
        await Conversation.find({
            participants: userId,

            deletedFor: {
                $ne: userId,
            },
        })
            .populate(
                "participants",
                "_id name phone role profileImage"
            )
            .populate(
                "buildingId",
                "_id name buildingNumber"
            )
            .populate(
                "relatedVisitId",
                "_id visitorName visitorPhone visitDate status"
            )
            .populate(
                "lastMessage",
                "_id senderId senderType message createdAt isDeleted deletedAt"
            )
            .sort({
                lastMessageAt: -1,
                updatedAt: -1,
            });

    const result =
        await Promise.all(
            conversations.map(
                async (conversation) => {
                    const unreadCount =
                        await getUnreadCount(
                            userId,
                            conversation
                        );

                    const object =
                        conversation.toObject();

                    object.unreadCount =
                        unreadCount;

                    if (
                        object.lastMessage
                            ?.isDeleted
                    ) {
                        object.lastMessage.message =
                            "This message was deleted";
                    }

                    return object;
                }
            )
        );

    return result;
};

// =========================================================
// GET CONVERSATION
// =========================================================

const getConversationById = async (
    userId,
    conversationId
) => {
    if (
        !isValidObjectId(
            conversationId
        )
    ) {
        const error = new Error(
            "Invalid conversation ID"
        );

        error.statusCode = 400;
        throw error;
    }

    await getActiveUserById(userId);

    const conversation =
        await Conversation.findById(
            conversationId
        )
            .populate(
                "participants",
                "_id name phone role profileImage"
            )
            .populate(
                "buildingId",
                "_id name buildingNumber"
            )
            .populate(
                "relatedVisitId",
                "_id visitorName visitorPhone visitDate status"
            );

    if (!conversation) {
        const error = new Error(
            "Conversation not found"
        );

        error.statusCode = 404;
        throw error;
    }

    const isParticipant =
        conversation.participants.some(
            (participant) =>
                participant._id.toString() ===
                userId.toString()
        );

    if (!isParticipant) {
        const error = new Error(
            "You are not allowed to access this conversation"
        );

        error.statusCode = 403;
        throw error;
    }

    return conversation;
};

// =========================================================
// SEND USER MESSAGE
// =========================================================

const sendUserMessage = async (
    userId,
    conversationId,
    messageText
) => {
    if (
        !isValidObjectId(
            conversationId
        )
    ) {
        const error = new Error(
            "Invalid conversation ID"
        );

        error.statusCode = 400;
        throw error;
    }

    if (
        !messageText ||
        typeof messageText !== "string" ||
        !messageText.trim()
    ) {
        const error = new Error(
            "Message is required"
        );

        error.statusCode = 400;
        throw error;
    }

    const sender =
        await getActiveUserById(
            userId
        );

    const conversation =
        await Conversation.findById(
            conversationId
        );

    if (!conversation) {
        const error = new Error(
            "Conversation not found"
        );

        error.statusCode = 404;
        throw error;
    }

    const isParticipant =
        conversation.participants.some(
            (participantId) =>
                participantId.toString() ===
                sender._id.toString()
        );

    if (!isParticipant) {
        const error = new Error(
            "You are not allowed to send messages in this conversation"
        );

        error.statusCode = 403;
        throw error;
    }

    const messageData = {
        conversationId:
            conversation._id,

        senderType: "USER",

        senderId:
            sender._id,

        message:
            messageText.trim(),
    };

    if (
        conversation.type ===
        "GROUP"
    ) {
        messageData.readBy = [
            sender._id,
        ];
    }

    const message =
        await Message.create(
            messageData
        );

    conversation.lastMessage =
        message._id;

    conversation.lastMessageAt =
        message.createdAt;

    // Sending a new message restores
    // visibility only for the sender.
    conversation.deletedFor =
        conversation.deletedFor.filter(
            (id) =>
                id.toString() !==
                sender._id.toString()
        );

    await conversation.save();

    return message;
};

// =========================================================
// SEND VISITOR MESSAGE
// =========================================================

const sendVisitorMessage = async (
    visitId,
    token,
    conversationId,
    messageText
) => {
    if (
        !isValidObjectId(
            conversationId
        )
    ) {
        const error = new Error(
            "Invalid conversation ID"
        );

        error.statusCode = 400;
        throw error;
    }

    if (
        !messageText ||
        typeof messageText !== "string" ||
        !messageText.trim()
    ) {
        const error = new Error(
            "Message is required"
        );

        error.statusCode = 400;
        throw error;
    }

    const visit =
        await verifyVisitorChatToken(
            visitId,
            token
        );

    const conversation =
        await Conversation.findOne({
            _id: conversationId,
            type: "VISITOR",
            relatedVisitId: visit._id,
        });

    if (!conversation) {
        const error = new Error(
            "Visitor conversation not found"
        );

        error.statusCode = 404;
        throw error;
    }

    const message =
        await Message.create({
            conversationId:
                conversation._id,

            senderType:
                "VISITOR",

            senderId: null,

            message:
                messageText.trim(),
        });

    conversation.lastMessage =
        message._id;

    conversation.lastMessageAt =
        message.createdAt;

    await conversation.save();

    return message;
};

// =========================================================
// GET USER MESSAGES
// =========================================================

const getMessages = async (
    userId,
    conversationId
) => {
    await getConversationById(
        userId,
        conversationId
    );

    return Message.find({
        conversationId,

        deletedFor: {
            $ne: userId,
        },
    })
        .populate(
            "senderId",
            "_id name phone role profileImage"
        )
        .populate(
            "readBy",
            "_id name phone role profileImage"
        )
        .sort({
            createdAt: 1,
        });
};

// =========================================================
// GET VISITOR MESSAGES
// =========================================================

const getVisitorMessages = async (
    visitId,
    token,
    conversationId
) => {
    const visit =
        await verifyVisitorChatToken(
            visitId,
            token
        );

    const conversation =
        await Conversation.findOne({
            _id: conversationId,
            type: "VISITOR",
            relatedVisitId: visit._id,
        });

    if (!conversation) {
        const error = new Error(
            "Visitor conversation not found"
        );

        error.statusCode = 404;
        throw error;
    }

    return Message.find({
        conversationId,
    })
        .populate(
            "senderId",
            "_id name phone role profileImage"
        )
        .sort({
            createdAt: 1,
        });
};

// =========================================================
// MARK USER MESSAGES AS READ
// =========================================================

const markMessagesAsRead = async (
    userId,
    conversationId
) => {
    if (
        !isValidObjectId(
            conversationId
        )
    ) {
        const error = new Error(
            "Invalid conversation ID"
        );

        error.statusCode = 400;
        throw error;
    }

    const conversation =
        await getConversationById(
            userId,
            conversationId
        );

    if (
        conversation.type ===
        "VISITOR"
    ) {
        const result =
            await Message.updateMany(
                {
                    conversationId,

                    senderType:
                        "VISITOR",

                    isRead: false,

                    deletedFor: {
                        $ne: userId,
                    },

                    isDeleted: false,
                },
                {
                    $set: {
                        isRead: true,
                    },
                }
            );

        return {
            modifiedCount:
                result.modifiedCount,
        };
    }

    if (
        conversation.type ===
        "GROUP"
    ) {
        const messages =
            await Message.find({
                conversationId,

                senderId: {
                    $ne: userId,
                },

                readBy: {
                    $ne: userId,
                },

                deletedFor: {
                    $ne: userId,
                },

                isDeleted: false,
            }).select("_id");

        if (
            messages.length === 0
        ) {
            return {
                modifiedCount: 0,
            };
        }

        const messageIds =
            messages.map(
                (message) =>
                    message._id
            );

        const result =
            await Message.updateMany(
                {
                    _id: {
                        $in: messageIds,
                    },
                },
                {
                    $addToSet: {
                        readBy: userId,
                    },
                }
            );

        return {
            modifiedCount:
                result.modifiedCount,
        };
    }

    const result =
        await Message.updateMany(
            {
                conversationId,

                senderId: {
                    $ne: userId,
                },

                isRead: false,

                deletedFor: {
                    $ne: userId,
                },

                isDeleted: false,
            },
            {
                $set: {
                    isRead: true,
                },
            }
        );

    return {
        modifiedCount:
            result.modifiedCount,
    };
};

// =========================================================
// MARK VISITOR MESSAGES AS READ
// =========================================================

const markVisitorMessagesAsRead =
    async (
        visitId,
        token,
        conversationId
    ) => {
        const visit =
            await verifyVisitorChatToken(
                visitId,
                token
            );

        const conversation =
            await Conversation.findOne({
                _id: conversationId,
                type: "VISITOR",
                relatedVisitId:
                    visit._id,
            });

        if (!conversation) {
            const error = new Error(
                "Visitor conversation not found"
            );

            error.statusCode = 404;
            throw error;
        }

        const result =
            await Message.updateMany(
                {
                    conversationId,

                    senderType:
                        "USER",

                    isRead: false,
                },
                {
                    $set: {
                        isRead: true,
                    },
                }
            );

        return {
            modifiedCount:
                result.modifiedCount,
        };
    };

// =========================================================
// DELETE MESSAGE FOR ME
// =========================================================

const deleteMessageForMe = async (
    userId,
    messageId
) => {
    if (
        !isValidObjectId(
            messageId
        )
    ) {
        const error = new Error(
            "Invalid message ID"
        );

        error.statusCode = 400;
        throw error;
    }

    await getActiveUserById(
        userId
    );

    const message =
        await Message.findById(
            messageId
        );

    if (!message) {
        const error = new Error(
            "Message not found"
        );

        error.statusCode = 404;
        throw error;
    }

    // Visitor messages cannot be deleted
    // using the user delete-for-me endpoint.
    if (
        message.senderType ===
        "VISITOR"
    ) {
        const error = new Error(
            "Visitor messages cannot be deleted by users"
        );

        error.statusCode = 403;
        throw error;
    }

    const conversation =
        await Conversation.findById(
            message.conversationId
        );

    if (!conversation) {
        const error = new Error(
            "Conversation not found"
        );

        error.statusCode = 404;
        throw error;
    }

    const isParticipant =
        conversation.participants.some(
            (participantId) =>
                participantId.toString() ===
                userId.toString()
        );

    if (!isParticipant) {
        const error = new Error(
            "You are not allowed to delete this message"
        );

        error.statusCode = 403;
        throw error;
    }

    const alreadyDeleted =
        message.deletedFor.some(
            (id) =>
                id.toString() ===
                userId.toString()
        );

    if (!alreadyDeleted) {
        message.deletedFor.push(
            userId
        );

        await message.save();
    }

    return {
        messageId:
            message._id,

        conversationId:
            message.conversationId,
    };
};

// =========================================================
// DELETE MESSAGE FOR EVERYONE
// =========================================================

const deleteMessageForEveryone =
    async (
        userId,
        messageId
    ) => {
        if (
            !isValidObjectId(
                messageId
            )
        ) {
            const error = new Error(
                "Invalid message ID"
            );

            error.statusCode = 400;
            throw error;
        }

        const sender =
            await getActiveUserById(
                userId
            );

        const message =
            await Message.findById(
                messageId
            );

        if (!message) {
            const error = new Error(
                "Message not found"
            );

            error.statusCode = 404;
            throw error;
        }

        if (
            message.senderType !==
            "USER"
        ) {
            const error = new Error(
                "This message cannot be deleted for everyone"
            );

            error.statusCode = 403;
            throw error;
        }

        if (
            !message.senderId
        ) {
            const error = new Error(
                "Message sender not found"
            );

            error.statusCode = 400;
            throw error;
        }

        if (
            message.senderId.toString() !==
            sender._id.toString()
        ) {
            const error = new Error(
                "You can only delete your own messages for everyone"
            );

            error.statusCode = 403;
            throw error;
        }

        if (
            message.isDeleted
        ) {
            return {
                messageId:
                    message._id,

                conversationId:
                    message.conversationId,

                message,
            };
        }

        message.isDeleted = true;
        message.deletedAt = new Date();

        message.message =
            "This message was deleted";

        await message.save();

        return {
            messageId:
                message._id,

            conversationId:
                message.conversationId,

            message,
        };
    };

// =========================================================
// DELETE CONVERSATION FOR ME
// =========================================================

const deleteConversationForMe =
    async (
        userId,
        conversationId
    ) => {
        if (
            !isValidObjectId(
                conversationId
            )
        ) {
            const error = new Error(
                "Invalid conversation ID"
            );

            error.statusCode = 400;
            throw error;
        }

        await getActiveUserById(
            userId
        );

        const conversation =
            await Conversation.findById(
                conversationId
            );

        if (!conversation) {
            const error = new Error(
                "Conversation not found"
            );

            error.statusCode = 404;
            throw error;
        }

        const isParticipant =
            conversation.participants.some(
                (participantId) =>
                    participantId.toString() ===
                    userId.toString()
            );

        if (!isParticipant) {
            const error = new Error(
                "You are not allowed to delete this conversation"
            );

            error.statusCode = 403;
            throw error;
        }

        const alreadyDeleted =
            conversation.deletedFor.some(
                (id) =>
                    id.toString() ===
                    userId.toString()
            );

        if (!alreadyDeleted) {
            conversation.deletedFor.push(
                userId
            );

            await conversation.save();
        }

        return {
            conversationId:
                conversation._id,
        };
    };

module.exports = {
    searchUsersByPhone,

    canDirectChat,
    canResidentAndTechnicianChat,

    getOrCreateDirectConversation,

    getCompoundGroup,
    getBuildingGroup,

    verifyVisitorChatToken,
    getOrCreateVisitorConversation,

    getMyConversations,
    getConversationById,

    sendUserMessage,
    sendVisitorMessage,

    getMessages,
    getVisitorMessages,

    markMessagesAsRead,
    markVisitorMessagesAsRead,

    getUnreadCount,

    deleteMessageForMe,
    deleteMessageForEveryone,
    deleteConversationForMe,
};