const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
    {
        ticketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MaintenanceTicket",
            required: true,
        },

        technicianId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        estimatedDuration: {
            type: Number,
            required: true,
            min: 1,
        },

        note: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "ACCEPTED",
                "REJECTED",
                "WITHDRAWN",
            ],
            default: "PENDING",
        },
    },
    {
        timestamps: true,
    }
);

offerSchema.index(
    { ticketId: 1, technicianId: 1 },
    { unique: true }
);

const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;