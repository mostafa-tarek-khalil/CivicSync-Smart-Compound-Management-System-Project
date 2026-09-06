const mongoose = require("mongoose");

const negotiationSchema = new mongoose.Schema(
    {
        offerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer",
            required: true,
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        senderRole: {
            type: String,
            enum: ["RESIDENT", "TECHNICIAN"],
            required: true,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        message: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

negotiationSchema.index({
    offerId: 1,
    createdAt: 1,
});

const Negotiation = mongoose.model("Negotiation", negotiationSchema);

module.exports = Negotiation;