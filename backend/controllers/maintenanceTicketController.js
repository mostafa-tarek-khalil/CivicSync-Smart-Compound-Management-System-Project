const MaintenanceTicket = require("../models/maintenanceTicket");

const createTicket = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      attachmentUrl,
    } = req.body;

    if (!title || !description || !category || !priority) {
      return res.status(400).json({
        message: "title, description, category and priority are required",
      });
    }

    const ticket = await MaintenanceTicket.create({
      residentId: req.user.userId,
      title,
      description,
      category,
      priority,
      attachmentUrl,
      status: "OPEN",
    });

    res.status(201).json({
      message: "Maintenance ticket created successfully",
      ticket,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create maintenance ticket",
      error: error.message,
    });
  }
};

const getResidentTickets = async (req, res) => {
  try {
    const tickets = await MaintenanceTicket.find({
      residentId: req.user.userId,
    })
      .populate("assignedTo", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get tickets",
      error: error.message,
    });
  }
};

const getTicketDetails = async (req, res) => {
  try {
    const ticket = await MaintenanceTicket.findOne({
      _id: req.params.id,
      residentId: req.user.userId,
    })
      .populate("residentId", "firstName lastName username")
      .populate("assignedTo", "firstName lastName username");

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    res.status(200).json({
      ticket,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get ticket",
      error: error.message,
    });
  }
};

const closeTicket = async (req, res) => {
  try {
    const ticket = await MaintenanceTicket.findOne({
      _id: req.params.id,
      residentId: req.user.userId,
    });

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (ticket.status !== "RESOLVED") {
      return res.status(400).json({
        message: "Only RESOLVED tickets can be closed",
      });
    }

    ticket.status = "CLOSED";

    await ticket.save();

    res.status(200).json({
      message: "Ticket closed successfully",
      ticket,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to close ticket",
      error: error.message,
    });
  }
};

module.exports = {
  createTicket,
  getResidentTickets,
  getTicketDetails,
  closeTicket,
};