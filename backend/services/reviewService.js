const UserModel = require("../models/user");
const maintenanceTicketModel = require("../models/maintenanceTicket");
const ReviewModel = require("../models/review");


const CreateReview = async (residentId, ticketId, { rating, comment }) => {

    if (!rating) {
        const error = new Error("rating is required");
        error.statusCode = 400;
        throw error;
    }

    if (rating < 1 || rating > 5) {
        const error = new Error("Rating must be between 1 and 5");
        error.statusCode = 400;
        throw error;
    }

    const ticket = await maintenanceTicketModel.findOne({
        _id: ticketId,
        residentId
    });

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "CLOSED") {
        const error = new Error("You can only review a closed ticket");
        error.statusCode = 400;
        throw error;
    }

    if (!ticket.assignedTo) {
        const error = new Error("No technician assigned to this ticket");
        error.statusCode = 400;
        throw error;
    }

    const existingReview = await ReviewModel.findOne({
        ticketId: ticket._id
    });

    if (existingReview) {
        const error = new Error("You already reviewed this ticket");
        error.statusCode = 400;
        throw error;
    }

    const review = await ReviewModel.create({
        ticketId: ticket._id,
        residentId,
        technicianId: ticket.assignedTo,
        rating,
        comment,
    });

    await recalculateTechnicianRating(ticket.assignedTo);

    return review;
};


const DeleteReview = async (reviewId, residentId) => {

    const review = await ReviewModel.findOne({
        _id: reviewId,
        residentId
    });

    if (!review) {
        const error = new Error("Review not found");
        error.statusCode = 404;
        throw error;
    }

    const technicianId = review.technicianId;

    await ReviewModel.findByIdAndDelete(reviewId);

    await recalculateTechnicianRating(technicianId);
};


const updateReview = async (reviewId, residentId, { rating, comment }) => {

    if (!rating) {
        const error = new Error("rating is required");
        error.statusCode = 400;
        throw error;
    }

    if (rating < 1 || rating > 5) {
        const error = new Error("Rating must be between 1 and 5");
        error.statusCode = 400;
        throw error;
    }

    const review = await ReviewModel.findOne({
        _id: reviewId,
        residentId
    });

    if (!review) {
        const error = new Error("Review not found");
        error.statusCode = 404;
        throw error;
    }

    review.rating = rating;

    if (comment !== undefined) {
        review.comment = comment;
    }

    await review.save();

    await recalculateTechnicianRating(review.technicianId);

    return review;
};


const getTicketReview = async (ticketId, residentId) => {
    return await ReviewModel.findOne({
        ticketId,
        residentId
    });
};

const getTechnicianReviews = async (technicianId) => {

    return await ReviewModel.find({
        technicianId
    })
        .populate("residentId", "name")
        .sort({ createdAt: -1 });
};


const recalculateTechnicianRating = async (technicianId) => {

    const reviews = await ReviewModel.find({
        technicianId
    });

    const totalReviews = reviews.length;

    if (totalReviews === 0) {

        await UserModel.findByIdAndUpdate(technicianId, {
            rating: 0,
            totalReviews: 0
        });

        return;
    }

    const totalRating = reviews.reduce((sum, review) => {
        return sum + review.rating;
    }, 0);

    const rating = totalRating / totalReviews;

    await UserModel.findByIdAndUpdate(technicianId, {
        rating,
        totalReviews
    });
};


module.exports = {
    CreateReview,
    DeleteReview,
    updateReview,
    getTicketReview,
    getTechnicianReviews,
    recalculateTechnicianRating
};