const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },

        senderType: {
            type: String,
            enum: ["USER", "VISITOR"],
            required: true,
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },

        isRead: {
            type: Boolean,
            default: false,
        },

        readBy: [
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

messageSchema.index({
    conversationId: 1,
    createdAt: 1,
});

messageSchema.index({
    senderId: 1,
    createdAt: -1,
});

messageSchema.index({
    readBy: 1,
});

module.exports = mongoose.model("Message", messageSchema);