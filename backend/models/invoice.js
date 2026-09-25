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
            // Optional: an admin may raise a standalone invoice for a resident
            // / unit that is not tied to a maintenance ticket.
            required: false,
            default: null,
        },

        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Unit",
            required: false,
            default: null,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 300,
            default: null,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "PAYMENT_SUBMITTED",
                "PAID",
                "OVERDUE",
                "CANCELLED",
            ],
            default: "PENDING",
        },

        /**
         * Set when the RESIDENT claims to have paid (Pay button). Acts as the
         * audit trail for the admin's "Approve paid" decision and prevents a
         * resident from re-submitting the same invoice.
         */
        paymentSubmittedAt: {
            type: Date,
            default: null,
        },

        /** Free-text reference the resident may leave with a payment claim. */
        paymentReference: {
            type: String,
            trim: true,
            maxlength: 200,
            default: null,
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

// A ticket can only be invoiced once, but standalone (ticket-less) invoices
// are unlimited. `sparse` keeps the unique rule meaningful only for the
// non-null ticket references.
invoiceSchema.index(
    { ticketId: 1 },
    { unique: true, sparse: true }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;