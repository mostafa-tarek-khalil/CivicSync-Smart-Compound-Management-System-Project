const MaintenanceTicket = require("../models/maintenanceTicket");
const User = require("../models/user");

const getTechnicianFilter = async (technicianId) => {
  const technician = await User.findById(technicianId).select("specializations");
  const specializations = technician?.specializations || [];

  const filter = {
    status: "OPEN",
    skippedBy: { $nin: [technicianId] },
  };

  if (specializations.length > 0) {
    filter.category = { $in: specializations };
  }

  return filter;
};

const getAvailableTickets = async (technicianId) => {
  const filter = await getTechnicianFilter(technicianId);

  return await MaintenanceTicket.find(filter)
    .populate("residentId", "name")
    .sort({ createdAt: -1 });
};

const getAvailableTicketDetails = async (ticketId, technicianId) => {
  const filter = await getTechnicianFilter(technicianId);
  filter._id = ticketId;

  const ticket = await MaintenanceTicket.findOne(filter).populate(
    "residentId",
    "name email phone"
  );

  if (!ticket) {
    const error = new Error("Ticket not found or not available to you");
    error.statusCode = 404;
    throw error;
  }

  return ticket;
};

const startTicket = async (ticketId, technicianId) => {
  const ticket = await MaintenanceTicket.findById(ticketId);

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }
  if (ticket.status !== "ASSIGNED") {
    const error = new Error("Only ASSIGNED tickets can be started");
    error.statusCode = 400;
    throw error;
  }
  if (!ticket.assignedTo || ticket.assignedTo.toString() !== technicianId.toString()) {
    const error = new Error("This ticket is not assigned to you");
    error.statusCode = 403;
    throw error;
  }

  ticket.status = "IN_PROGRESS";
  return await ticket.save();
};

const resolveTicket = async (ticketId, technicianId) => {
  const ticket = await MaintenanceTicket.findById(ticketId);

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }
  if (ticket.status !== "IN_PROGRESS") {
    const error = new Error("Only IN_PROGRESS tickets can be resolved");
    error.statusCode = 400;
    throw error;
  }

  if (!ticket.assignedTo || ticket.assignedTo.toString() !== technicianId.toString()) {
    const error = new Error("This ticket is not assigned to you");
    error.statusCode = 403;
    throw error;
  }

  ticket.status = "RESOLVED";
  ticket.resolvedAt = new Date();
  return await ticket.save();
};

const skipTicket = async (ticketId, technicianId) => {
  const ticket = await MaintenanceTicket.findById(ticketId);

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  if (ticket.status !== "OPEN") {
    const error = new Error("Only OPEN tickets can be skipped");
    error.statusCode = 400;
    throw error;
  }

  if (ticket.skippedBy.some((id) => id.toString() === technicianId.toString())) {
    const error = new Error("You already skipped this ticket");
    error.statusCode = 400;
    throw error;
  }

  ticket.skippedBy.push(technicianId);
  return await ticket.save();
};

const getAssignedTickets = async (technicianId) => {
  return await MaintenanceTicket.find({ assignedTo: technicianId })
    .populate("residentId", "name email phone")
    .sort({ createdAt: -1 });
};

const getAssignedTicketDetails = async (ticketId, technicianId) => {
  const ticket = await MaintenanceTicket.findOne({
    _id: ticketId,
    assignedTo: technicianId,
  }).populate("residentId", "name email phone");

  if (!ticket) {
    const error = new Error("Ticket not found or not assigned to you");
    error.statusCode = 404;
    throw error;
  }

  return ticket;
};

module.exports = {
  getAvailableTickets,
  getAvailableTicketDetails,
  getAssignedTickets,
  getAssignedTicketDetails,
  startTicket,
  resolveTicket,
  skipTicket,
};
