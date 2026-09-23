const technicianService = require("../services/technicianService");

const getAvailableTickets = async (req, res) => {
  try {
    const tickets = await technicianService.getAvailableTickets(req.user.userId);
    res.status(200).json({
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch available tickets",
    });
  }
};

const startTicket = async (req, res) => {
  try {
    const ticket = await technicianService.startTicket(req.params.id, req.user.userId);
    res.status(200).json({
      message: "Ticket started successfully",
      ticket,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to start ticket",
    });
  }
};

const resolveTicket = async (req, res) => {
  try {
    const ticket = await technicianService.resolveTicket(req.params.id, req.user.userId);
    res.status(200).json({
      message: "Ticket resolved successfully",
      ticket,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to resolve ticket",
    });
  }
};

const skipTicket = async (req, res) => {
  try {
    const ticket = await technicianService.skipTicket(req.params.id, req.user.userId);
    res.status(200).json({
      message: "Ticket skipped successfully",
      ticket,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to skip ticket",
    });
  }
};

const getAssignedTickets = async (req, res) => {
  try {
    const tickets = await technicianService.getAssignedTickets(req.user.userId);
    res.status(200).json({
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to get assigned tickets",
    });
  }
};

const getAssignedTicketDetails = async (req, res) => {
  try {
    const ticket = await technicianService.getAssignedTicketDetails(
      req.params.id,
      req.user.userId
    );
    res.status(200).json({ ticket });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to get ticket details",
    });
  }
};

const getAvailableTicketDetails = async (req, res) => {
  try {
    const ticket = await technicianService.getAvailableTicketDetails(
      req.params.id,
      req.user.userId
    );
    res.status(200).json({ ticket });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to get ticket details",
    });
  }
};

module.exports = {
  getAvailableTickets,
  getAvailableTicketDetails,
  startTicket,
  resolveTicket,
  skipTicket,
  getAssignedTickets,
  getAssignedTicketDetails,
};