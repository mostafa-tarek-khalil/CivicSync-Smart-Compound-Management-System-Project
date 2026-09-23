const reviewService = require("../services/reviewService");

const createReview = async (req, res) => {
  try {
    const review = await reviewService.CreateReview(
      req.user.userId,
      req.params.ticketId,
      req.body
    );
    res.status(201).json({
      message: "Review created successfully",
      review,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to create review",
    });
  }
};

const updateReview = async (req, res) => {
  try {
    const review = await reviewService.updateReview(
      req.params.id,
      req.user.userId,
      req.body
    );
    res.status(200).json({
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to update review",
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    await reviewService.DeleteReview(req.params.id, req.user.userId);
    res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to delete review",
    });
  }
};

const getTicketReview = async (req, res) => {
  try {
    const review = await reviewService.getTicketReview(
      req.params.ticketId,
      req.user.userId
    );
    res.status(200).json({ review });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to get review",
    });
  }
};

const getTechnicianReviews = async (req, res) => {
  try {
    const technicianId = req.params.technicianId || req.user.userId;
    const reviews = await reviewService.getTechnicianReviews(technicianId);
    res.status(200).json({
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to get reviews",
    });
  }
};

module.exports = {
  createReview,
  getTicketReview,
  getTechnicianReviews,
  updateReview,
  deleteReview,
};