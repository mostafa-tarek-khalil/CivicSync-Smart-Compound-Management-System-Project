const MaintenanceTicket = require("../models/maintenanceTicket");
const Review = require("../models/review");
const { createNotification } = require("./notificationService");
const {
    TICKET_STATUS,
    assertTicketTransition,
    isTicketChatLocked,
} = require("../utils/statusConstants");

const createTicket = async (residentId, ticketData) => {
    const {
        title,
        description,
        category,
        priority,
        attachmentUrl,
    } = ticketData;

    if (!title || !description || !category || !priority) {
        const error = new Error(
            "title, description, category and priority are required"
        );
        error.statusCode = 400;
        throw error;
    }

    const ticket = await MaintenanceTicket.create({
        residentId,
        title,
        description,
        category,
        priority,
        attachmentUrl: attachmentUrl || null,
        status: "OPEN",
    });

    await createNotification({
        userId: residentId,
        type: "MAINTENANCE_CREATED",
        title: "Maintenance request created",
        message: `Your request “${ticket.title}” has been submitted.`,
        relatedId: ticket._id,
    });

    return ticket;
};

const getResidentTickets = async (residentId) => {
    return await MaintenanceTicket.find({ residentId })
        .populate("assignedTo", "name email phone role rating totalReviews")
        .sort({ createdAt: -1 });
};

const getTicketDetails = async (ticketId, residentId) => {
    const ticket = await MaintenanceTicket.findOne({
        _id: ticketId,
        residentId,
    })
        .populate("residentId", "name email phone")
        .populate("assignedTo", "name email phone role rating totalReviews");

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    const review = await Review.findOne({
        ticketId: ticket._id,
        residentId,
    }).populate("technicianId", "name email phone role rating totalReviews");

    return {
        ticket,
        review,
    };
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
        const error = new Error(
            "Only RESOLVED tickets can be closed"
        );
        error.statusCode = 400;
        throw error;
    }

    // Shared state machine: only RESOLVED -> CLOSED is legal.
    assertTicketTransition(
        ticket.status,
        TICKET_STATUS.CLOSED
    );

    ticket.status = "CLOSED";
    // Closing is terminal: the maintenance conversation stays locked.
    ticket.chatLocked = isTicketChatLocked(TICKET_STATUS.CLOSED);

    return await ticket.save();
};

module.exports = {
    createTicket,
    getResidentTickets,
    getTicketDetails,
    closeTicket,
};
