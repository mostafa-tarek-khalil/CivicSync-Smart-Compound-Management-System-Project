const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["DIRECT", "GROUP", "VISITOR"],
            required: true,
        },

        groupType: {
            type: String,
            enum: ["COMPOUND", "BUILDING"],
            default: null,
        },

        buildingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Building",
            default: null,
        },

        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],

        relatedVisitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Visit",
            default: null,
        },

        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },

        lastMessageAt: {
            type: Date,
            default: null,
        },

        // Users who hid this conversation for themselves
        deletedFor: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
    }
);

conversationSchema.index({
    participants: 1,
    lastMessageAt: -1,
});

conversationSchema.index({
    type: 1,
    groupType: 1,
    buildingId: 1,
});

/**
 * One visitor conversation per visit.
 *
 * The index is explicitly NAMED. Without a name, Mongoose derives
 * `relatedVisitId_1`, which collides with the legacy index of the same name
 * that older databases already contain (created before the partial filter
 * existed). That collision is what produced the
 * "Index already exists with a different name" / duplicate-index warning on
 * startup. Naming it keeps the new definition isolated from the old one.
 */
conversationSchema.index(
    {
        relatedVisitId: 1,
    },
    {
        name: "visitor_conversation_visit_unique",
        unique: true,
        partialFilterExpression: {
            type: "VISITOR",
            relatedVisitId: {
                $exists: true,
                $ne: null,
            },
        },
    }
);

conversationSchema.index({
    deletedFor: 1,
});

module.exports = mongoose.model(
    "Conversation",
    conversationSchema
);