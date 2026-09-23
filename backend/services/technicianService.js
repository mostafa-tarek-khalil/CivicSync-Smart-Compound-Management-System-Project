const MaintenanceTicket = require("../models/maintenanceTicket");
const { createNotification } = require("./notificationService");

const getAvailableTickets = async (technicianId) => {
    return await MaintenanceTicket.find({
        status: "OPEN",
        skippedBy: { $ne: technicianId },
    })
        .populate(
            "residentId",
            "name email phone"
        )
        .sort({ createdAt: -1 });
};

const startTicket = async (
    ticketId,
    technicianId
) => {
    const ticket =
        await MaintenanceTicket.findById(
            ticketId
        );

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "ASSIGNED") {
        const error = new Error(
            "Only ASSIGNED tickets can be started"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        !ticket.assignedTo ||
        ticket.assignedTo.toString() !==
            technicianId.toString()
    ) {
        const error = new Error(
            "This ticket is not assigned to you"
        );
        error.statusCode = 403;
        throw error;
    }

    const updatedTicket =
        await MaintenanceTicket.findOneAndUpdate(
            {
                _id: ticketId,
                assignedTo: technicianId,
                status: "ASSIGNED",
            },
            {
                $set: {
                    status: "IN_PROGRESS",
                },
            },
            {
                new: true,
            }
        );

    if (!updatedTicket) {
        const error = new Error(
            "Ticket status has already changed"
        );
        error.statusCode = 400;
        throw error;
    }

    await createNotification({
        userId: updatedTicket.residentId,
        type: "TICKET_STATUS_CHANGED",
        title: "Maintenance request in progress",
        message: `Work has started on maintenance request "${updatedTicket.title}".`,
        relatedId: updatedTicket._id,
    });

    return updatedTicket;
};

const resolveTicket = async (
    ticketId,
    technicianId
) => {
    const ticket =
        await MaintenanceTicket.findById(
            ticketId
        );

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "IN_PROGRESS") {
        const error = new Error(
            "Only IN_PROGRESS tickets can be resolved"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        !ticket.assignedTo ||
        ticket.assignedTo.toString() !==
            technicianId.toString()
    ) {
        const error = new Error(
            "This ticket is not assigned to you"
        );
        error.statusCode = 403;
        throw error;
    }

    const updatedTicket =
        await MaintenanceTicket.findOneAndUpdate(
            {
                _id: ticketId,
                assignedTo: technicianId,
                status: "IN_PROGRESS",
            },
            {
                $set: {
                    status: "RESOLVED",
                },
            },
            {
                new: true,
            }
        );

    if (!updatedTicket) {
        const error = new Error(
            "Ticket status has already changed"
        );
        error.statusCode = 400;
        throw error;
    }

    await createNotification({
        userId: updatedTicket.residentId,
        type: "TICKET_STATUS_CHANGED",
        title: "Maintenance request resolved",
        message: `Maintenance request "${updatedTicket.title}" has been marked as resolved.`,
        relatedId: updatedTicket._id,
    });

    return updatedTicket;
};

const skipTicket = async (
    ticketId,
    technicianId
) => {
    const updatedTicket =
        await MaintenanceTicket.findOneAndUpdate(
            {
                _id: ticketId,
                status: "OPEN",
                skippedBy: {
                    $ne: technicianId,
                },
            },
            {
                $addToSet: {
                    skippedBy: technicianId,
                },
            },
            {
                new: true,
            }
        );

    if (updatedTicket) {
        return updatedTicket;
    }

    const ticket =
        await MaintenanceTicket.findById(
            ticketId
        );

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "OPEN") {
        const error = new Error(
            "Only OPEN tickets can be skipped"
        );
        error.statusCode = 400;
        throw error;
    }

    const error = new Error(
        "You already skipped this ticket"
    );
    error.statusCode = 400;
    throw error;
};

const getAssignedTickets = async (
    technicianId
) => {
    return await MaintenanceTicket.find({
        assignedTo: technicianId,
    })
        .populate(
            "residentId",
            "name email phone"
        )
        .sort({ createdAt: -1 });
};

const getAssignedTicketDetails = async (
    ticketId,
    technicianId
) => {
    const ticket =
        await MaintenanceTicket.findOne({
            _id: ticketId,
            assignedTo: technicianId,
        }).populate(
            "residentId",
            "name email phone"
        );

    if (!ticket) {
        const error = new Error(
            "Ticket not found or not assigned to you"
        );
        error.statusCode = 404;
        throw error;
    }

    return ticket;
};

module.exports = {
    getAvailableTickets,
    getAssignedTickets,
    getAssignedTicketDetails,
    startTicket,
    resolveTicket,
    skipTicket,
};
