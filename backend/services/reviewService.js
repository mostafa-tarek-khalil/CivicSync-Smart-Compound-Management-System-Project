const User = require("../models/user");
const MaintenanceTicket = require("../models/maintenanceTicket");
const Review = require("../models/review");

const createReview = async (
    residentId,
    ticketId,
    { rating, comment }
) => {
    if (rating === undefined) {
        const error = new Error("rating is required");
        error.statusCode = 400;
        throw error;
    }

    const numericRating = Number(rating);

    if (
        Number.isNaN(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
    ) {
        const error = new Error(
            "Rating must be between 1 and 5"
        );
        error.statusCode = 400;
        throw error;
    }

    const ticket = await MaintenanceTicket.findOne({
        _id: ticketId,
        residentId,
    });

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "CLOSED") {
        const error = new Error(
            "You can only review a closed ticket"
        );
        error.statusCode = 400;
        throw error;
    }

    if (!ticket.assignedTo) {
        const error = new Error(
            "No technician assigned to this ticket"
        );
        error.statusCode = 400;
        throw error;
    }

    const existingReview = await Review.findOne({
        ticketId: ticket._id,
    });

    if (existingReview) {
        const error = new Error(
            "You already reviewed this ticket"
        );
        error.statusCode = 400;
        throw error;
    }

    let review;

    try {
        review = await Review.create({
            ticketId: ticket._id,
            residentId,
            technicianId: ticket.assignedTo,
            rating: numericRating,
            comment,
        });
    } catch (error) {
        if (error.code === 11000) {
            const duplicateError = new Error(
                "You already reviewed this ticket"
            );
            duplicateError.statusCode = 400;
            throw duplicateError;
        }

        throw error;
    }

    await recalculateTechnicianRating(
        ticket.assignedTo
    );

    return review;
};

const deleteReview = async (
    reviewId,
    residentId
) => {
    const review = await Review.findOne({
        _id: reviewId,
        residentId,
    });

    if (!review) {
        const error = new Error("Review not found");
        error.statusCode = 404;
        throw error;
    }

    const technicianId = review.technicianId;

    await Review.findByIdAndDelete(reviewId);

    await recalculateTechnicianRating(
        technicianId
    );

    return {
        message: "Review deleted successfully",
    };
};

const updateReview = async (
    reviewId,
    residentId,
    { rating, comment }
) => {
    if (rating === undefined) {
        const error = new Error("rating is required");
        error.statusCode = 400;
        throw error;
    }

    const numericRating = Number(rating);

    if (
        Number.isNaN(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
    ) {
        const error = new Error(
            "Rating must be between 1 and 5"
        );
        error.statusCode = 400;
        throw error;
    }

    const review = await Review.findOne({
        _id: reviewId,
        residentId,
    });

    if (!review) {
        const error = new Error("Review not found");
        error.statusCode = 404;
        throw error;
    }

    review.rating = numericRating;

    if (comment !== undefined) {
        review.comment = comment;
    }

    await review.save();

    await recalculateTechnicianRating(
        review.technicianId
    );

    return review;
};

const getTechnicianReviews = async (
    technicianId
) => {
    return await Review.find({
        technicianId,
    })
        .populate(
            "residentId",
            "name"
        )
        .sort({ createdAt: -1 });
};

const recalculateTechnicianRating = async (
    technicianId
) => {
    const reviews = await Review.find({
        technicianId,
    }).select("rating");

    const totalReviews = reviews.length;

    if (totalReviews === 0) {
        await User.findByIdAndUpdate(
            technicianId,
            {
                rating: 0,
                totalReviews: 0,
            }
        );

        return;
    }

    const totalRating = reviews.reduce(
        (sum, review) =>
            sum + review.rating,
        0
    );

    const rating =
        totalRating / totalReviews;

    await User.findByIdAndUpdate(
        technicianId,
        {
            rating,
            totalReviews,
        }
    );
};

module.exports = {
    createReview,
    deleteReview,
    updateReview,
    getTechnicianReviews,
    recalculateTechnicianRating,
};