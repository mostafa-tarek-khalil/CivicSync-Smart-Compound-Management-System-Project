const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
    {
        residentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        ticketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MaintenanceTicket",
            required: true,
            unique: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: ["PENDING", "PAID", "OVERDUE", "CANCELLED"],
            default: "PENDING",
        },

        dueDate: {
            type: Date,
            required: true,
        },

        paidAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

invoiceSchema.index({
    residentId: 1,
    status: 1,
    dueDate: 1,
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;