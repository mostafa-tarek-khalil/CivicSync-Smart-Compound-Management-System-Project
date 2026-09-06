const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        type: {
            type: String,
            enum: [
                "VISITOR_REQUEST",
                "VISITOR_APPROVED",
                "VISITOR_REJECTED",
                "VISITOR_CHECKED_IN",
                "VISITOR_CHECKED_OUT",

                "MAINTENANCE_CREATED",
                "NEW_OFFER",
                "NEW_NEGOTIATION",
                "OFFER_ACCEPTED",
                "OFFER_REJECTED",

                "TICKET_ASSIGNED",
                "TICKET_STATUS_CHANGED",

                "NEW_MESSAGE",

                "ACCOUNT_APPROVED",
                "ACCOUNT_REJECTED",

                "INVOICE_CREATED",
                "INVOICE_DUE",
            ],
            required: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },

        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },

        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

notificationSchema.index({
    userId: 1,
    isRead: 1,
    createdAt: -1,
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;