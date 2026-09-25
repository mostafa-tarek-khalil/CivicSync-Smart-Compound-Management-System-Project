const mongoose = require("mongoose");

const maintenanceTicketSchema = new mongoose.Schema(
    {
        residentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 150,
        },

        category: {
            type: String,
            enum: [
                "PLUMBING",
                "ELECTRICITY",
                "ELEVATOR",
                "AC",
                "GENERAL",
            ],
            required: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 1000,
        },

        attachmentUrl: {
            type: String,
            default: null,
        },

        priority: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
            default: "MEDIUM",
        },

        status: {
            type: String,
            enum: [
                "OPEN",
                "ASSIGNED",
                "IN_PROGRESS",
                "RESOLVED",
                "CLOSED",
            ],
            default: "OPEN",
        },

        /**
         * Maintenance chats are locked automatically once a ticket reaches a
         * final state. Stored explicitly (instead of only being derived from
         * `status`) so an admin can also lock a conversation manually, and so
         * the client can render the read-only composer without re-deriving the
         * rule from the status list.
         */
        chatLocked: {
            type: Boolean,
            default: false,
        },

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        skippedBy: [
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

maintenanceTicketSchema.index({
    residentId: 1,
    createdAt: -1,
});

maintenanceTicketSchema.index({
    status: 1,
    category: 1,
    createdAt: -1,
});

const MaintenanceTicket = mongoose.model("MaintenanceTicket", maintenanceTicketSchema);

module.exports = MaintenanceTicket;