const MaintenanceTicket = require("../models/maintenanceTicket");

const createTicket = async (residentId, ticketData) => {
  const { title, description, category, priority, attachmentUrl } = ticketData;

  if (!title || !description || !category || !priority) {
    const error = new Error("title, description, category and priority are required");
    error.statusCode = 400;
    throw error;
  }

  return await MaintenanceTicket.create({
    residentId,
    title,
    description,
    category,
    priority,
    attachmentUrl,
    status: "OPEN",
  });
};

const getResidentTickets = async (residentId) => {
  return await MaintenanceTicket.find({ residentId })
    .populate("assignedTo", "name")
    .sort({ createdAt: -1 });
};

const getTicketDetails = async (ticketId, residentId) => {
  const ticket = await MaintenanceTicket.findOne({
    _id: ticketId,
    residentId,
  })
    .populate("residentId", "name")
    .populate("assignedTo", "name");

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  return ticket;
};

const closeTicket = async (ticketId, residentId) => {
  const ticket = await MaintenanceTicket.findOne({
    _id: ticketId,
    residentId,
  });

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  if (ticket.status !== "RESOLVED") {
    const error = new Error("Only RESOLVED tickets can be closed");
    error.statusCode = 400;
    throw error;
  }

  ticket.status = "CLOSED";
  return await ticket.save();
};

module.exports = {
  createTicket,
  getResidentTickets,
  getTicketDetails,
  closeTicket,
};