const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],

        lastMessage: {
            type: String,
            trim: true,
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

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;