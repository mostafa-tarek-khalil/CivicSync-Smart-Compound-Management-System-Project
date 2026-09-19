const mongoose = require("mongoose");
const crypto = require("crypto");

const Conversation = require("../models/conversation");
const Message = require("../models/message");
const User = require("../models/user");
const Unit = require("../models/unit");
const Building = require("../models/building");
const Visit = require("../models/visit");
const MaintenanceTicket = require("../models/maintenanceTicket");

const VISITOR_CHAT_DURATION = 24 * 60 * 60 * 1000;

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const getActiveUserById = async (userId) => {
    if (!isValidObjectId(userId)) {
        throw new Error("Invalid user ID");
    }

    const user = await User.findById(userId).select(
        "_id name email phone role status unitId"
    );

    if (!user) {
        throw new Error("User not found");
    }

    if (user.status !== "ACTIVE") {
        throw new Error("User is not active");
    }

    return user;
};

/*
 * Search active users by exact phone number.
 */
const searchUsersByPhone = async (userId, phone) => {
    await getActiveUserById(userId);

    if (!phone || typeof phone !== "string") {
        throw new Error("Phone number is required");
    }

    const users = await User.find({
        phone: phone.trim(),
        status: "ACTIVE",
        _id: { $ne: userId },
    }).select("_id name phone role unitId");

    return users;
};

/*
 * Resident <-> Technician chat is allowed
 * only when the technician is assigned to
 * one of the resident's maintenance tickets.
 */
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

/*
 * Direct chat permission rules.
 */
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

    /*
     * Admin can chat with anyone.
     */
    if (
        sender.role === "ADMIN" ||
        receiver.role === "ADMIN"
    ) {
        return true;
    }

    /*
     * Resident rules.
     */
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

    /*
     * Security can directly chat with residents.
     */
    if (sender.role === "SECURITY") {
        return receiver.role === "RESIDENT";
    }

    /*
     * Technician can directly chat with resident
     * only if assigned to that resident's ticket.
     */
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

/*
 * Create or return a direct conversation.
 */
const getOrCreateDirectConversation = async (
    senderId,
    receiverId
) => {
    const sender = await getActiveUserById(senderId);
    const receiver = await getActiveUserById(receiverId);

    const allowed = await canDirectChat(sender, receiver);

    if (!allowed) {
        throw new Error(
            "You are not allowed to chat with this user"
        );
    }

    const participants = [sender._id, receiver._id].sort(
        (a, b) =>
            a.toString().localeCompare(b.toString())
    );

    let conversation = await Conversation.findOne({
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
    }

    return conversation;
};

/*
 * Compound group.
 *
 * Members:
 * - RESIDENT
 * - SECURITY
 * - ADMIN
 */
const getCompoundGroup = async (userId) => {
    const user = await getActiveUserById(userId);

    if (
        !["RESIDENT", "SECURITY", "ADMIN"].includes(
            user.role
        )
    ) {
        throw new Error(
            "You are not allowed to access the compound group"
        );
    }

    const participants = await User.find({
        role: {
            $in: ["RESIDENT", "SECURITY", "ADMIN"],
        },
        status: "ACTIVE",
    }).select("_id");

    let conversation = await Conversation.findOne({
        type: "GROUP",
        groupType: "COMPOUND",
    });

    const participantIds = participants.map(
        (participant) => participant._id
    );

    if (!conversation) {
        conversation = await Conversation.create({
            type: "GROUP",
            groupType: "COMPOUND",
            participants: participantIds,
        });
    } else {
        conversation.participants = participantIds;
        await conversation.save();
    }

    return conversation;
};

/*
 * Building group.
 *
 * Residents:
 * - Only residents belonging to this building
 *
 * Security:
 * - All active security officers
 *
 * Admin:
 * - All active admins
 */
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
        throw new Error(
            "You are not allowed to access building groups"
        );
    }

    if (!isValidObjectId(buildingId)) {
        throw new Error("Invalid building ID");
    }

    const buildingExists = await Building.exists({
        _id: buildingId,
    });

    if (!buildingExists) {
        throw new Error("Building not found");
    }

    /*
     * Resident can only access own building group.
     */
    if (user.role === "RESIDENT") {
        if (!user.unitId) {
            throw new Error(
                "Resident is not assigned to a unit"
            );
        }

        const residentUnit = await Unit.findById(
            user.unitId
        ).select("buildingId");

        if (!residentUnit) {
            throw new Error("Resident unit not found");
        }

        if (
            residentUnit.buildingId.toString() !==
            buildingId.toString()
        ) {
            throw new Error(
                "You can only access your building group"
            );
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

    const securityAndAdmins = await User.find({
        role: {
            $in: ["SECURITY", "ADMIN"],
        },
        status: "ACTIVE",
    }).select("_id");

    const participantIds = [
        ...residents.map(
            (resident) => resident._id
        ),
        ...securityAndAdmins.map(
            (user) => user._id
        ),
    ];

    let conversation = await Conversation.findOne({
        type: "GROUP",
        groupType: "BUILDING",
        buildingId,
    });

    if (!conversation) {
        conversation = await Conversation.create({
            type: "GROUP",
            groupType: "BUILDING",
            buildingId,
            participants: participantIds,
        });
    } else {
        conversation.participants = participantIds;
        await conversation.save();
    }

    return conversation;
};

/*
 * Verify Visitor Chat Token.
 *
 * Token is generated from visitService and stored
 * as a SHA-256 hash inside the Visit document.
 */
const verifyVisitorChatToken = async (
    visitId,
    token
) => {
    if (!isValidObjectId(visitId)) {
        throw new Error("Invalid visit ID");
    }

    if (!token || typeof token !== "string") {
        throw new Error("Visitor chat token is required");
    }

    const visit = await Visit.findById(visitId).select(
        "+visitorChatTokenHash"
    );

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (!visit.visitorChatTokenHash) {
        throw new Error(
            "Visitor chat is not initialized"
        );
    }

    if (
        !visit.visitorChatTokenExpiresAt ||
        visit.visitorChatTokenExpiresAt < new Date()
    ) {
        throw new Error(
            "Visitor chat token has expired"
        );
    }

    /*
     * Visitor chat is allowed only during these
     * visit states.
     */
    if (
        !["APPROVED", "QR_GENERATED", "CHECKED_IN"].includes(
            visit.status
        )
    ) {
        throw new Error(
            "Chat is not available for this visit"
        );
    }

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    if (tokenHash !== visit.visitorChatTokenHash) {
        throw new Error(
            "Invalid visitor chat token"
        );
    }

    return visit;
};

/*
 * Create or get Visitor Conversation.
 *
 * One conversation is allowed per Visit.
 */
const getOrCreateVisitorConversation = async (
    visitId,
    token
) => {
    const visit = await verifyVisitorChatToken(
        visitId,
        token
    );

    let conversation = await Conversation.findOne({
        type: "VISITOR",
        relatedVisitId: visit._id,
    });

    if (!conversation) {
        try {
            conversation = await Conversation.create({
                type: "VISITOR",
                relatedVisitId: visit._id,
                participants: [visit.residentId],
            });
        } catch (error) {
            if (error.code === 11000) {
                conversation =
                    await Conversation.findOne({
                        type: "VISITOR",
                        relatedVisitId: visit._id,
                    });
            } else {
                throw error;
            }
        }
    }

    return conversation;
};

/*
 * Get unread message count for one conversation.
 *
 * DIRECT:
 *   Messages from other users where isRead = false.
 *
 * GROUP:
 *   Messages where current user is not in readBy
 *   and message was not sent by current user.
 *
 * VISITOR:
 *   Visitor messages where isRead = false.
 */
const getUnreadCount = async (
    userId,
    conversation
) => {
    if (conversation.type === "VISITOR") {
        return Message.countDocuments({
            conversationId: conversation._id,
            senderType: "VISITOR",
            isRead: false,
        });
    }

    if (conversation.type === "GROUP") {
        return Message.countDocuments({
            conversationId: conversation._id,
            senderId: {
                $ne: userId,
            },
            readBy: {
                $ne: userId,
            },
        });
    }

    return Message.countDocuments({
        conversationId: conversation._id,
        senderId: {
            $ne: userId,
        },
        isRead: false,
    });
};

/*
 * Get all conversations belonging to a User.
 */
const getMyConversations = async (userId) => {
    await getActiveUserById(userId);

    const conversations = await Conversation.find({
        participants: userId,
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
            "_id senderId senderType message createdAt"
        )
        .sort({
            lastMessageAt: -1,
            updatedAt: -1,
        });

    /*
     * Add unreadCount to every conversation.
     */
    const conversationsWithUnreadCount =
        await Promise.all(
            conversations.map(async (conversation) => {
                const unreadCount =
                    await getUnreadCount(
                        userId,
                        conversation
                    );

                const conversationObject =
                    conversation.toObject();

                conversationObject.unreadCount =
                    unreadCount;

                return conversationObject;
            })
        );

    return conversationsWithUnreadCount;
};

/*
 * Get one User conversation.
 */
const getConversationById = async (
    userId,
    conversationId
) => {
    if (!isValidObjectId(conversationId)) {
        throw new Error("Invalid conversation ID");
    }

    await getActiveUserById(userId);

    const conversation = await Conversation.findById(
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
        throw new Error("Conversation not found");
    }

    const isParticipant = conversation.participants.some(
        (participant) =>
            participant._id.toString() ===
            userId.toString()
    );

    if (!isParticipant) {
        throw new Error(
            "You are not allowed to access this conversation"
        );
    }

    return conversation;
};

/*
 * Send message as authenticated User.
 */
const sendUserMessage = async (
    userId,
    conversationId,
    messageText
) => {
    if (!isValidObjectId(conversationId)) {
        throw new Error("Invalid conversation ID");
    }

    if (
        !messageText ||
        typeof messageText !== "string" ||
        !messageText.trim()
    ) {
        throw new Error("Message is required");
    }

    const sender = await getActiveUserById(userId);

    const conversation =
        await Conversation.findById(conversationId);

    if (!conversation) {
        throw new Error("Conversation not found");
    }

    const isParticipant = conversation.participants.some(
        (participantId) =>
            participantId.toString() ===
            sender._id.toString()
    );

    if (!isParticipant) {
        throw new Error(
            "You are not allowed to send messages in this conversation"
        );
    }

    const messageData = {
        conversationId: conversation._id,
        senderType: "USER",
        senderId: sender._id,
        message: messageText.trim(),
    };

    if (conversation.type === "GROUP") {
        messageData.readBy = [sender._id];
    }

    const message = await Message.create(messageData);

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    await conversation.save();

    return message;
};

/*
 * Send message as Visitor.
 */
const sendVisitorMessage = async (
    visitId,
    token,
    conversationId,
    messageText
) => {
    if (!isValidObjectId(conversationId)) {
        throw new Error("Invalid conversation ID");
    }

    if (
        !messageText ||
        typeof messageText !== "string" ||
        !messageText.trim()
    ) {
        throw new Error("Message is required");
    }

    const visit = await verifyVisitorChatToken(
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
        throw new Error(
            "Visitor conversation not found"
        );
    }

    const message = await Message.create({
        conversationId: conversation._id,
        senderType: "VISITOR",
        senderId: null,
        message: messageText.trim(),
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    await conversation.save();

    return message;
};

/*
 * Get messages for authenticated User.
 */
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

/*
 * Get messages as Visitor.
 */
const getVisitorMessages = async (
    visitId,
    token,
    conversationId
) => {
    const visit = await verifyVisitorChatToken(
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
        throw new Error(
            "Visitor conversation not found"
        );
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

/*
 * Mark messages as read for authenticated User.
 */
const markMessagesAsRead = async (
    userId,
    conversationId
) => {
    if (!isValidObjectId(conversationId)) {
        throw new Error("Invalid conversation ID");
    }

    const conversation =
        await getConversationById(
            userId,
            conversationId
        );

    /*
     * Visitor conversation.
     */
    if (conversation.type === "VISITOR") {
        const result = await Message.updateMany(
            {
                conversationId,
                senderType: "VISITOR",
                isRead: false,
            },
            {
                $set: {
                    isRead: true,
                },
            }
        );

        return {
            modifiedCount: result.modifiedCount,
        };
    }

    /*
     * Group conversation.
     */
    if (conversation.type === "GROUP") {
        const messages = await Message.find({
            conversationId,
            senderId: {
                $ne: userId,
            },
            readBy: {
                $ne: userId,
            },
        }).select("_id");

        if (messages.length === 0) {
            return {
                modifiedCount: 0,
            };
        }

        const messageIds = messages.map(
            (message) => message._id
        );

        const result = await Message.updateMany(
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
            modifiedCount: result.modifiedCount,
        };
    }

    /*
     * Direct conversation.
     */
    const result = await Message.updateMany(
        {
            conversationId,
            senderId: {
                $ne: userId,
            },
            isRead: false,
        },
        {
            $set: {
                isRead: true,
            },
        }
    );

    return {
        modifiedCount: result.modifiedCount,
    };
};

/*
 * Mark User messages as read for Visitor.
 */
const markVisitorMessagesAsRead = async (
    visitId,
    token,
    conversationId
) => {
    const visit = await verifyVisitorChatToken(
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
        throw new Error(
            "Visitor conversation not found"
        );
    }

    const result = await Message.updateMany(
        {
            conversationId,
            senderType: "USER",
            isRead: false,
        },
        {
            $set: {
                isRead: true,
            },
        }
    );

    return {
        modifiedCount: result.modifiedCount,
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
};