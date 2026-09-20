const Negotiation = require("../models/negotiation");
const Offer = require("../models/offer");
const MaintenanceTicket = require("../models/maintenanceTicket");

const getOfferForUser = async (offerId, userId, role) => {
    const offer = await Offer.findById(offerId);

    if (!offer) {
        const error = new Error("Offer not found");
        error.statusCode = 404;
        throw error;
    }

    const ticket = await MaintenanceTicket.findById(
        offer.ticketId
    );

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (role === "RESIDENT") {
        if (
            ticket.residentId.toString() !==
            userId.toString()
        ) {
            const error = new Error(
                "You can only access negotiations for your own tickets"
            );
            error.statusCode = 403;
            throw error;
        }
    }

    if (role === "TECHNICIAN") {
        if (
            offer.technicianId.toString() !==
            userId.toString()
        ) {
            const error = new Error(
                "You can only access negotiations for your own offers"
            );
            error.statusCode = 403;
            throw error;
        }
    }

    return offer;
};

const getNegotiations = async (
    offerId,
    userId,
    role
) => {
    await getOfferForUser(offerId, userId, role);

    return await Negotiation.find({ offerId })
        .populate(
            "senderId",
            "name email phone role"
        )
        .sort({ createdAt: 1 });
};

const createNegotiation = async (
    offerId,
    userId,
    role,
    { price, message }
) => {
    if (price === undefined) {
        const error = new Error("price is required");
        error.statusCode = 400;
        throw error;
    }

    const numericPrice = Number(price);

    if (
        Number.isNaN(numericPrice) ||
        numericPrice < 0
    ) {
        const error = new Error(
            "Price must be 0 or greater"
        );
        error.statusCode = 400;
        throw error;
    }

    const offer = await getOfferForUser(
        offerId,
        userId,
        role
    );

    if (offer.status !== "PENDING") {
        const error = new Error(
            "Negotiation is only available for pending offers"
        );
        error.statusCode = 400;
        throw error;
    }

    const negotiation = await Negotiation.create({
        offerId,
        senderId: userId,
        senderRole: role,
        price: numericPrice,
        message,
    });

    return await negotiation.populate(
        "senderId",
        "name email phone role"
    );
};

module.exports = {
    getNegotiations,
    createNegotiation,
};