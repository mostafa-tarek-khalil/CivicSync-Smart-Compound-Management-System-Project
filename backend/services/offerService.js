const Offer = require("../models/offer");
const MaintenanceTicket = require("../models/maintenanceTicket");

const getTicketOffers = async (ticketId, residentId) => {
    const ticket = await MaintenanceTicket.findById(ticketId);

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (
        ticket.residentId.toString() !== residentId.toString()
    ) {
        const error = new Error(
            "You can only view offers for your own ticket"
        );
        error.statusCode = 403;
        throw error;
    }

    return await Offer.find({ ticketId })
        .populate(
            "technicianId",
            "name email phone role rating totalReviews"
        )
        .sort({ createdAt: -1 });
};

const createOffer = async (
    ticketId,
    technicianId,
    { price, estimatedDuration, note }
) => {
    if (
        price === undefined ||
        estimatedDuration === undefined
    ) {
        const error = new Error(
            "price and estimatedDuration are required"
        );
        error.statusCode = 400;
        throw error;
    }

    const numericPrice = Number(price);
    const numericDuration = Number(estimatedDuration);

    if (
        Number.isNaN(numericPrice) ||
        Number.isNaN(numericDuration) ||
        numericPrice < 0 ||
        numericDuration <= 0
    ) {
        const error = new Error(
            "price must be 0 or greater and estimatedDuration must be greater than 0"
        );
        error.statusCode = 400;
        throw error;
    }

    const ticket = await MaintenanceTicket.findById(ticketId);

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "OPEN") {
        const error = new Error(
            "You can only make an offer on an open ticket"
        );
        error.statusCode = 400;
        throw error;
    }

    const existingOffer = await Offer.findOne({
        ticketId,
        technicianId,
    });

    if (existingOffer) {
        const error = new Error(
            "You already made an offer for this ticket"
        );
        error.statusCode = 400;
        throw error;
    }

    return await Offer.create({
        ticketId,
        technicianId,
        price: numericPrice,
        estimatedDuration: numericDuration,
        note,
    });
};

const updateOffer = async (
    offerId,
    technicianId,
    { price, estimatedDuration, note }
) => {
    const offer = await Offer.findById(offerId);

    if (!offer) {
        const error = new Error("Offer not found");
        error.statusCode = 404;
        throw error;
    }

    if (
        offer.technicianId.toString() !==
        technicianId.toString()
    ) {
        const error = new Error(
            "You can only update your own offer"
        );
        error.statusCode = 403;
        throw error;
    }

    if (offer.status !== "PENDING") {
        const error = new Error(
            "Only pending offers can be updated"
        );
        error.statusCode = 400;
        throw error;
    }

    if (price !== undefined) {
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

        offer.price = numericPrice;
    }

    if (estimatedDuration !== undefined) {
        const numericDuration = Number(estimatedDuration);

        if (
            Number.isNaN(numericDuration) ||
            numericDuration <= 0
        ) {
            const error = new Error(
                "Estimated duration must be greater than 0"
            );
            error.statusCode = 400;
            throw error;
        }

        offer.estimatedDuration = numericDuration;
    }

    if (note !== undefined) {
        offer.note = note;
    }

    await offer.save();

    return offer;
};

const withdrawOffer = async (offerId, technicianId) => {
    const offer = await Offer.findById(offerId);

    if (!offer) {
        const error = new Error("Offer not found");
        error.statusCode = 404;
        throw error;
    }

    if (
        offer.technicianId.toString() !==
        technicianId.toString()
    ) {
        const error = new Error(
            "You can only withdraw your own offer"
        );
        error.statusCode = 403;
        throw error;
    }

    if (offer.status !== "PENDING") {
        const error = new Error(
            "Only pending offers can be withdrawn"
        );
        error.statusCode = 400;
        throw error;
    }

    offer.status = "WITHDRAWN";

    await offer.save();

    return offer;
};

const getMyOffers = async (technicianId) => {
    return await Offer.find({
        technicianId,
    })
        .populate(
            "ticketId",
            "title category priority status residentId"
        )
        .sort({ createdAt: -1 });
};

const acceptOffer = async (offerId, residentId) => {
    const offer = await Offer.findById(offerId);

    if (!offer) {
        const error = new Error("Offer not found");
        error.statusCode = 404;
        throw error;
    }

    if (offer.status !== "PENDING") {
        const error = new Error(
            "Only pending offers can be accepted"
        );
        error.statusCode = 400;
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

    if (
        ticket.residentId.toString() !==
        residentId.toString()
    ) {
        const error = new Error(
            "You can only accept offers for your own ticket"
        );
        error.statusCode = 403;
        throw error;
    }

    if (ticket.status !== "OPEN") {
        const error = new Error(
            "Offers can only be accepted for OPEN tickets"
        );
        error.statusCode = 400;
        throw error;
    }

    offer.status = "ACCEPTED";
    await offer.save();

    ticket.status = "ASSIGNED";
    ticket.assignedTo = offer.technicianId;
    await ticket.save();

    await Offer.updateMany(
        {
            ticketId: offer.ticketId,
            _id: { $ne: offerId },
            status: "PENDING",
        },
        {
            $set: {
                status: "REJECTED",
            },
        }
    );

    return offer;
};

module.exports = {
    getTicketOffers,
    createOffer,
    updateOffer,
    withdrawOffer,
    getMyOffers,
    acceptOffer,
};