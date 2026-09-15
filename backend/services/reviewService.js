const Review = require("../models/review");
const MaintenanceTicket = require("../models/maintenanceTicket");
const User = require("../models/user");

const recalculateTechnicianRating = async (technicianId) => {
  const stats = await Review.aggregate([
    { $match: { technicianId } },
    {
      $group: {
        _id: "$technicianId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await User.findByIdAndUpdate(technicianId, {
      rating: parseFloat(stats[0].averageRating.toFixed(2)),
      totalReviews: stats[0].totalReviews,
    });
  } else {
    await User.findByIdAndUpdate(technicianId, {
      rating: 0,
      totalReviews: 0,
    });
  }
};

const createReview = async (ticketId, residentId, { rating, comment }) => {
  if (rating === undefined) {
    const error = new Error("rating is required");
    error.statusCode = 400;
    throw error;
  }

  if (rating < 1 || rating > 5) {
    const error = new Error("Rating must be between 1 and 5");
    error.statusCode = 400;
    throw error;
  }

  const ticket = await MaintenanceTicket.findOne({ _id: ticketId, residentId });

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

  const existingReview = await Review.findOne({ ticketId: ticket._id });
  if (existingReview) {
    const error = new Error("You already reviewed this ticket");
    error.statusCode = 400;
    throw error;
  }

  const review = await Review.create({
    ticketId: ticket._id,
    residentId,
    technicianId: ticket.assignedTo,
    rating,
    comment,
  });

  await recalculateTechnicianRating(ticket.assignedTo);
  // TODO: Notification hook (Technician Review Created)
  return review;
};

const getTechnicianReviews = async (technicianId) => {
  return await Review.find({ technicianId })
    .populate("residentId", "name")
    .sort({ createdAt: -1 });
};

const updateReview = async (reviewId, residentId, { rating, comment }) => {
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    const error = new Error("Rating must be between 1 and 5");
    error.statusCode = 400;
    throw error;
  }

  const review = await Review.findOne({ _id: reviewId, residentId });

  if (!review) {
    const error = new Error("Review not found");
    error.statusCode = 404;
    throw error;
  }

  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;

  await review.save();
  await recalculateTechnicianRating(review.technicianId);
  return review;
};

const deleteReview = async (reviewId, residentId) => {
  const review = await Review.findOne({ _id: reviewId, residentId });

  if (!review) {
    const error = new Error("Review not found");
    error.statusCode = 404;
    throw error;
  }

  const technicianId = review.technicianId;
  await Review.findByIdAndDelete(reviewId);
  await recalculateTechnicianRating(technicianId);
  return true;
};

module.exports = {
  createReview,
  getTechnicianReviews,
  updateReview,
  deleteReview,
};