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
    // The service returns { ticket, location, invoice } — pass all of it through
    // so the job screen can render the printable receipt for this ticket.
    const details = await technicianService.getAssignedTicketDetails(
      req.params.id,
      req.user.userId
    );
    res.status(200).json(details);
  } catch (error) {
    // The client always reads `ticket`, so an error response that omits the key
    // leaves the job screen with no ticket at all — which rendered every
    // "Details" click as "No Request Loaded". Match the available-details
    // handler and always answer with the same top-level shape.
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to get ticket details",
      ticket: null,
      invoice: null,
    });
  }
};

const getAvailableTicketDetails = async (req, res) => {
  try {
    const { ticket, existingOffer } =
      await technicianService.getAvailableTicketDetails(
        req.params.id,
        req.user.userId
      );
    res.status(200).json({ ticket, existingOffer });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to get ticket details",
    });
  }
};

const getDashboard = async (req, res) => {
  try {
    const dashboard = await technicianService.getTechnicianDashboard(
      req.user.userId
    );
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load the technician dashboard",
    });
  }
};

module.exports = {
  getDashboard,
  getAvailableTickets,
  getAvailableTicketDetails,
  startTicket,
  resolveTicket,
  skipTicket,
  getAssignedTickets,
  getAssignedTicketDetails,
};
