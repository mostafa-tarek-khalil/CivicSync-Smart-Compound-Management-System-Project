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

conversationSchema.index(
    { relatedVisitId: 1 },
    {
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

module.exports = mongoose.model(
    "Conversation",
    conversationSchema
);