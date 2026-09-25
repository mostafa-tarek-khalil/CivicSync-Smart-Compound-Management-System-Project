const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
    {
        residentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        buildingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Building",
            required: true,
        },

        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Unit",
            required: true,
        },

        visitorName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        visitorEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        visitorPhone: {
            type: String,
            trim: true,
            default: null,
        },

        source: {
            type: String,
            enum: ["RESIDENT_INVITE", "VISITOR_REQUEST"],
            required: true,
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "APPROVED",
                "REJECTED",
                "QR_GENERATED",
                "QR_SCANNED",
                "CHECKED_IN",
                "CHECKED_OUT",
                "EXPIRED",
            ],
            default: "PENDING",
        },

        visitDate: {
            type: Date,
            required: true,
        },

        visitStartTime: {
            type: String,
            required: true,
        },

        purpose: {
            type: String,
            trim: true,
            maxlength: 300,
            default: null,
        },

        otpHash: {
            type: String,
            default: null,
            select: false,
        },

        otpExpiresAt: {
            type: Date,
            default: null,
            select: false,
        },

        otpAttempts: {
            type: Number,
            default: 0,
            min: 0,
            select: false,
        },

        qrTokenHash: {
            type: String,
            default: null,
            select: false,
        },

        // Raw copy of the currently-active QR token, kept ONLY so a legitimate
        // holder (resident / visitor who already proved ownership) can be
        // re-shown the same still-valid pass without minting a new one every
        // time the QR screen is (re)loaded. This is intentionally separate
        // from qrTokenHash (used for scan verification) and is cleared
        // whenever the QR is consumed, replaced, or the visit moves on.
        qrToken: {
            type: String,
            default: null,
            select: false,
        },

        qrExpiresAt: {
            type: Date,
            default: null,
        },

        visitorChatTokenHash: {
            type: String,
            default: null,
            select: false,
        },

        // Raw copy of the currently-active visitor chat token. Kept for the
        // same reason as qrToken below: a legitimate holder (the visitor who
        // already proved ownership) must be able to re-open the same still-valid
        // conversation instead of getting a new token on every poll, which
        // would invalidate the one already in their hands.
        visitorChatTokenRaw: {
            type: String,
            default: null,
            select: false,
        },

        visitorChatTokenExpiresAt: {
            type: Date,
            default: null,
        },

        approvedAt: {
            type: Date,
            default: null,
        },

        checkedInAt: {
            type: Date,
            default: null,
        },

        checkedOutAt: {
            type: Date,
            default: null,
        },

        securityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        checkOutSecurityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        qrScannedAt: {
            type: Date,
            default: null,
        },

        qrScannedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

visitSchema.index({ residentId: 1, visitDate: -1 });
visitSchema.index({ status: 1, visitDate: 1 });

const Visit = mongoose.model("Visit", visitSchema);

module.exports = Visit;