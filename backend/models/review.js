const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        ticketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MaintenanceTicket",
            required: true,
            unique: true,
        },

        residentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        technicianId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },

        comment: {
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

reviewSchema.index({
    technicianId: 1,
    createdAt: -1,
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;