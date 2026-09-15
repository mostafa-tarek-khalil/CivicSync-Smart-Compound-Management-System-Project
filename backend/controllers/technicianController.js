const MaintenanceTicket = require("../models/maintenanceTicket");

const startTicket = async (req, res) => {
  try {
    const ticket = await MaintenanceTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (!ticket.assignedTo) {
      return res.status(400).json({
        message: "Ticket has no assigned technician",
      });
    }

    if (ticket.assignedTo.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        message: "This ticket is not assigned to you",
      });
    }

    if (ticket.status !== "ASSIGNED") {
      return res.status(400).json({
        message: "Only ASSIGNED tickets can be started",
      });
    }

    ticket.status = "IN_PROGRESS";

    await ticket.save();

    res.status(200).json({
      message: "Ticket started successfully",
      ticket,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to start ticket",
      error: error.message,
    });
  }
};

const resolveTicket = async (req, res) => {
  try {
    const ticket = await MaintenanceTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (!ticket.assignedTo) {
      return res.status(400).json({
        message: "Ticket has no assigned technician",
      });
    }

    if (ticket.assignedTo.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        message: "This ticket is not assigned to you",
      });
    }

    if (ticket.status !== "IN_PROGRESS") {
      return res.status(400).json({
        message: "Only IN_PROGRESS tickets can be resolved",
      });
    }

    ticket.status = "RESOLVED";
    ticket.resolvedAt = new Date();

    await ticket.save();

    res.status(200).json({
      message: "Ticket resolved successfully",
      ticket,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to resolve ticket",
      error: error.message,
    });
  }
};

const skipTicket = async (req, res) => {
  try {
    const ticket = await MaintenanceTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (ticket.status !== "OPEN") {
      return res.status(400).json({
        message: "Only OPEN tickets can be skipped",
      });
    }

    const technicianId = req.user.userId;

    if (ticket.skippedBy.includes(technicianId)) {
      return res.status(400).json({
        message: "You already skipped this ticket",
      });
    }

    ticket.skippedBy.push(technicianId);

    await ticket.save();

    res.status(200).json({
      message: "Ticket skipped successfully",
      ticket,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to skip ticket",
      error: error.message,
    });
  }
};

module.exports = {
  startTicket,
  resolveTicket,
  skipTicket,
};