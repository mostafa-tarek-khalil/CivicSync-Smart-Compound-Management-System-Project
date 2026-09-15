const Review = require("../models/review");
const MaintenanceTicket = require("../models/maintenanceTicket");

// Create review
const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({
        message: "rating is required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    const ticket = await MaintenanceTicket.findOne({
      _id: req.params.ticketId,
      residentId: req.user.userId,
    });

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (ticket.status !== "CLOSED") {
      return res.status(400).json({
        message: "You can only review a closed ticket",
      });
    }

    if (!ticket.assignedTo) {
      return res.status(400).json({
        message: "No technician assigned to this ticket",
      });
    }

    const existingReview = await Review.findOne({
      ticketId: ticket._id,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You already reviewed this ticket",
      });
    }

    const review = await Review.create({
      ticketId: ticket._id,
      residentId: req.user.userId,
      technicianId: ticket.assignedTo,
      rating,
      comment,
    });

    res.status(201).json({
      message: "Review created successfully",
      review,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create review",
      error: error.message,
    });
  }
};


// Get technician reviews
const getTechnicianReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      technicianId: req.params.technicianId,
    })
      .populate("residentId", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get reviews",
      error: error.message,
    });
  }
};


// Update review
const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      residentId: req.user.userId,
    });

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    if (rating !== undefined) {
      review.rating = rating;
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    await review.save();

    res.status(200).json({
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update review",
      error: error.message,
    });
  }
};


// Delete review
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      residentId: req.user.userId,
    });

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete review",
      error: error.message,
    });
  }
};

module.exports = {
  createReview,
  getTechnicianReviews,
  updateReview,
  deleteReview,
};