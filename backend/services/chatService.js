const mongoose = require("mongoose");
const crypto = require("crypto");

const Conversation = require("../models/conversation");
const Message = require("../models/message");
const User = require("../models/user");
const Unit = require("../models/unit");
const Building = require("../models/building");
const Visit = require("../models/visit");
const MaintenanceTicket = require("../models/maintenanceTicket");
const { createNotification } = require("./notificationService");
const { isTicketChatLocked } = require("../utils/statusConstants");

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const escapeRegex = (value) => {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
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

    if (!searchPhone) {
        const error = new Error("Phone number is required");
        error.statusCode = 400;
        throw error;
    }

    const escapedPhone = escapeRegex(searchPhone);

    const users = await User.find({
        phone: {
            $regex: `^${escapedPhone}`,
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
    const tickets = await MaintenanceTicket.find({
        residentId,
        assignedTo: technicianId,
    }).select("status _id");

    // A resident and a technician may talk while at least ONE shared ticket is
    // still live. Once every shared job is finished (RESOLVED / CLOSED) the
    // channel closes with it.
    return tickets.some(
        (ticket) => !isTicketChatLocked(ticket.status)
    );
};

/**
 * Throw a 403 when the maintenance conversation tied to this ticket is locked.
 *
 * The link is derived from the conversation's two participants: for a
 * resident <-> technician DIRECT chat the active ticket is the one they share.
 */
const assertMaintenanceChatOpen = async (sender, receiver) => {
    const isResidentTechnicianPair =
        (sender.role === "RESIDENT" && receiver.role === "TECHNICIAN") ||
        (sender.role === "TECHNICIAN" && receiver.role === "RESIDENT");

    if (!isResidentTechnicianPair) {
        return;
    }

    const residentId =
        sender.role === "RESIDENT" ? sender._id : receiver._id;
    const technicianId =
        sender.role === "TECHNICIAN" ? sender._id : receiver._id;

    const tickets = await MaintenanceTicket.find({
        residentId,
        assignedTo: technicianId,
    }).select("status title");

    if (tickets.length === 0) {
        return;
    }

    const anyOpen = tickets.some(
        (ticket) => !isTicketChatLocked(ticket.status)
    );

    if (!anyOpen) {
        const error = new Error(
            "This maintenance conversation is closed because the job is finished."
        );
        error.statusCode = 403;
        throw error;
    }
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

    if (
        sender.role === "ADMIN" ||
        receiver.role === "ADMIN"
    ) {
        return true;
    }

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

    if (sender.role === "SECURITY") {
        return receiver.role === "RESIDENT";
    }

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
        try {
            conversation = await Conversation.create({
                type: "DIRECT",
                participants,
            });
        } catch (error) {
            if (error.code === 11000) {
                conversation =
                    await Conversation.findOne({
                        type: "DIRECT",
                        participants: {
                            $all: participants,
                            $size: 2,
                        },
                    });
            } else {
                throw error;
            }
        }
    }

    if (!conversation) {
        const error = new Error(
            "Failed to create conversation"
        );
        error.statusCode = 500;
        throw error;
    }

    conversation.deletedFor =
        conversation.deletedFor.filter(
            (userId) =>
                userId.toString() !==
                sender._id.toString()
        );

    await conversation.save();

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
        try {
            conversation =
                await Conversation.create({
                    type: "GROUP",
                    groupType: "COMPOUND",
                    participants: participantIds,
                });
        } catch (error) {
            if (error.code === 11000) {
                conversation =
                    await Conversation.findOne({
                        type: "GROUP",
                        groupType: "COMPOUND",
                    });
            } else {
                throw error;
            }
        }
    }

    if (!conversation) {
        const error = new Error(
            "Failed to create compound group"
        );
        error.statusCode = 500;
        throw error;
    }

    conversation.participants = participantIds;

    conversation.deletedFor =
        conversation.deletedFor.filter(
            (id) =>
                id.toString() !==
                userId.toString()
        );

    await conversation.save();

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
        try {
            conversation =
                await Conversation.create({
                    type: "GROUP",
                    groupType: "BUILDING",
                    buildingId,
                    participants: participantIds,
                });
        } catch (error) {
            if (error.code === 11000) {
                conversation =
                    await Conversation.findOne({
                        type: "GROUP",
                        groupType: "BUILDING",
                        buildingId,
                    });
            } else {
                throw error;
            }
        }
    }

    if (!conversation) {
        const error = new Error(
            "Failed to create building group"
        );
        error.statusCode = 500;
        throw error;
    }

    conversation.participants =
        participantIds;

    conversation.deletedFor =
        conversation.deletedFor.filter(
            (id) =>
                id.toString() !==
                userId.toString()
        );

    await conversation.save();

    return conversation;
};

/**
 * Ensure a conversation contains every id in `memberIds`, without ever
 * removing an existing participant.
 *
 * `$addToSet` is used so concurrent calls (two residents approved at once)
 * cannot clobber each other the way a read-modify-write `save()` would.
 */
const addParticipantsToConversation = async (conversationId, memberIds) => {
    if (!conversationId || memberIds.length === 0) {
        return;
    }

    await Conversation.updateOne(
        { _id: conversationId },
        {
            $addToSet: { participants: { $each: memberIds } },
            $pull: { deletedFor: { $in: memberIds } },
        }
    );
};

/**
 * Add a resident to the two system groups every resident belongs to:
 *  1. the compound-wide group, and
 *  2. their own building group.
 *
 * Called whenever a resident becomes usable (admin approval) or their unit
 * association changes, so the groups show up in their chat list with no manual
 * "join" step. Safe to call repeatedly: the lookups are by (type, groupType,
 * buildingId) and membership is added with $addToSet.
 */
const syncResidentGroupMemberships = async (resident) => {
    if (!resident || resident.role !== "RESIDENT") {
        return { compound: null, building: null };
    }

    const residentId = resident._id || resident.id;
    const result = { compound: null, building: null };

    // 1. Compound group — created on demand so a brand-new compound still gets
    //    a group as soon as its first resident is approved.
    const compoundParticipants = await User.find({
        role: { $in: ["RESIDENT", "SECURITY", "ADMIN"] },
        status: "ACTIVE",
    }).select("_id");

    let compoundGroup = await Conversation.findOne({
        type: "GROUP",
        groupType: "COMPOUND",
    });

    if (!compoundGroup) {
        try {
            compoundGroup = await Conversation.create({
                type: "GROUP",
                groupType: "COMPOUND",
                participants: compoundParticipants.map((user) => user._id),
            });
        } catch (error) {
            if (error.code === 11000) {
                compoundGroup = await Conversation.findOne({
                    type: "GROUP",
                    groupType: "COMPOUND",
                });
            } else {
                throw error;
            }
        }
    }

    if (compoundGroup) {
        await addParticipantsToConversation(compoundGroup._id, [residentId]);
        result.compound = compoundGroup._id;
    }

    // 2. Building group — only possible when the resident has a unit.
    if (!resident.unitId) {
        return result;
    }

    const unit = await Unit.findById(resident.unitId).select("buildingId");

    if (!unit || !unit.buildingId) {
        return result;
    }

    const buildingId = unit.buildingId;

    const units = await Unit.find({ buildingId }).select("_id");
    const unitIds = units.map((item) => item._id);

    const residentsInBuilding = await User.find({
        role: "RESIDENT",
        status: "ACTIVE",
        unitId: { $in: unitIds },
    }).select("_id");

    const staff = await User.find({
        role: { $in: ["SECURITY", "ADMIN"] },
        status: "ACTIVE",
    }).select("_id");

    const buildingParticipants = [
        ...residentsInBuilding.map((item) => item._id),
        ...staff.map((item) => item._id),
    ];

    let buildingGroup = await Conversation.findOne({
        type: "GROUP",
        groupType: "BUILDING",
        buildingId,
    });

    if (!buildingGroup) {
        try {
            buildingGroup = await Conversation.create({
                type: "GROUP",
                groupType: "BUILDING",
                buildingId,
                participants: buildingParticipants,
            });
        } catch (error) {
            if (error.code === 11000) {
                buildingGroup = await Conversation.findOne({
                    type: "GROUP",
                    groupType: "BUILDING",
                    buildingId,
                });
            } else {
                throw error;
            }
        }
    }

    if (buildingGroup) {
        await addParticipantsToConversation(buildingGroup._id, [residentId]);
        result.building = buildingGroup._id;
    }

    return result;
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

        if (!conversation) {
            const error = new Error(
                "Failed to create visitor conversation"
            );
            error.statusCode = 500;
            throw error;
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
// GET LAST VISIBLE MESSAGE
// =========================================================

const getLastVisibleMessage = async (
    conversationId,
    userId
) => {
    return Message.findOne({
        conversationId,
        deletedFor: {
            $ne: userId,
        },
    })
        .sort({
            createdAt: -1,
        })
        .select(
            "_id senderId senderType message createdAt isDeleted deletedAt"
        );
};

/**
 * Whether a DIRECT conversation is a finished maintenance thread.
 *
 * The client uses this to render a read-only composer instead of letting the
 * user type a message the server would reject. Returns false for group and
 * visitor conversations, which have their own lifecycles.
 */
const isConversationChatLocked = async (conversation) => {
    if (!conversation || conversation.type !== "DIRECT") {
        return false;
    }

    const participants = conversation.participants || [];

    const ids = participants.map((participant) =>
        String(participant._id || participant)
    );

    const users = await User.find({ _id: { $in: ids } }).select(
        "_id role"
    );

    const resident = users.find((user) => user.role === "RESIDENT");
    const technician = users.find((user) => user.role === "TECHNICIAN");

    if (!resident || !technician) {
        return false;
    }

    const tickets = await MaintenanceTicket.find({
        residentId: resident._id,
        assignedTo: technician._id,
    }).select("status");

    if (tickets.length === 0) {
        return false;
    }

    return tickets.every((ticket) => isTicketChatLocked(ticket.status));
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

                    const lastMessage =
                        await getLastVisibleMessage(
                            conversation._id,
                            userId
                        );

                    object.lastMessage =
                        lastMessage
                            ? lastMessage.toObject()
                            : null;

                    if (
                        object.lastMessage
                            ?.isDeleted
                    ) {
                        object.lastMessage.message =
                            "This message was deleted";
                    }

                    object.unreadCount =
                        unreadCount;

                    object.chatLocked =
                        await isConversationChatLocked(
                            conversation
                        );

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

    const isDeletedForUser =
        conversation.deletedFor.some(
            (id) =>
                id.toString() ===
                userId.toString()
        );

    if (isDeletedForUser) {
        const error = new Error(
            "Conversation is hidden for this user"
        );

        error.statusCode = 404;
        throw error;
    }

    const object = conversation.toObject();

    object.chatLocked = await isConversationChatLocked(conversation);

    return object;
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

    if (conversation.type === "VISITOR") {
        const visit = await Visit.findById(conversation.relatedVisitId);
        const chatAvailable = visit &&
            ["APPROVED", "QR_GENERATED", "CHECKED_IN"].includes(visit.status) &&
            visit.visitorChatTokenExpiresAt > new Date();

        if (!chatAvailable) {
            const error = new Error("Visitor chat is no longer available");
            error.statusCode = 403;
            throw error;
        }
    }

    if (conversation.type === "DIRECT") {
        // Maintenance conversations close with the job. Resolve the OTHER
        // participant so the resident/technician pair can be checked against
        // the ticket state machine.
        const otherParticipantId = conversation.participants.find(
            (participantId) =>
                participantId.toString() !== sender._id.toString()
        );

        if (otherParticipantId) {
            const other = await User.findById(otherParticipantId).select(
                "_id role status"
            );

            if (other) {
                await assertMaintenanceChatOpen(sender, other);
            }
        }
    }

    const isDeletedForUser =
        conversation.deletedFor.some(
            (id) =>
                id.toString() ===
                sender._id.toString()
        );

    if (isDeletedForUser) {
        const error = new Error(
            "Conversation is hidden for this user"
        );

        error.statusCode = 404;
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

    // New activity should restore a conversation that a participant hid.
    conversation.deletedFor = [];

    await conversation.save();

    const recipients = conversation.participants.filter(
        (participantId) => participantId.toString() !== sender._id.toString()
    );
    const preview = message.message.length > 140
        ? `${message.message.slice(0, 137)}...`
        : message.message;

    await Promise.all(recipients.map((recipientId) => createNotification({
        userId: recipientId,
        type: "NEW_MESSAGE",
        title: `New message from ${sender.name}`,
        message: preview,
        relatedId: conversation._id,
    })));

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

    // A new visitor message restores the resident's hidden conversation.
    conversation.deletedFor = [];

    await conversation.save();

    const preview = message.message.length > 140
        ? `${message.message.slice(0, 137)}...`
        : message.message;

    await createNotification({
        userId: visit.residentId,
        type: "NEW_MESSAGE",
        title: `New message from ${visit.visitorName}`,
        message: preview,
        relatedId: conversation._id,
    });

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

    syncResidentGroupMemberships,
    addParticipantsToConversation,

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
    isConversationChatLocked,

    deleteMessageForMe,
    deleteMessageForEveryone,
    deleteConversationForMe,
};
