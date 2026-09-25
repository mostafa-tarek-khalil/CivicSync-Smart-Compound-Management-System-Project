const ticketService = require("../services/maintenanceTicketService");

const createTicket = async (req, res) => {
    try {
        const ticket = await ticketService.createTicket(
            req.user.userId,
            req.body
        );

        res.status(201).json({
            message: "Maintenance ticket created successfully",
            ticket,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message:
                error.message ||
                "Failed to create maintenance ticket",
        });
    }
};

const getResidentTickets = async (req, res) => {
    try {
        const tickets = await ticketService.getResidentTickets(
            req.user.userId
        );

        res.status(200).json({
            count: tickets.length,
            tickets,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || "Failed to get tickets",
        });
    }
};

const getTicketDetails = async (req, res) => {
    try {
        const result = await ticketService.getTicketDetails(
            req.params.id,
            req.user.userId
        );

        res.status(200).json({
            ticket: result.ticket,
            review: result.review || null,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || "Failed to get ticket",
        });
    }
};

const closeTicket = async (req, res) => {
    try {
        const ticket = await ticketService.closeTicket(
            req.params.id,
            req.user.userId
        );

        res.status(200).json({
            message: "Ticket closed successfully",
            ticket,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || "Failed to close ticket",
        });
    }
};

module.exports = {
    createTicket,
    getResidentTickets,
    getTicketDetails,
    closeTicket,
};
