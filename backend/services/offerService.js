const Offer = require("../models/offer");
const Negotiation = require("../models/negotiation");
const MaintenanceTicket = require("../models/maintenanceTicket");
const { createNotification } = require("./notificationService");

const getTicketOffers = async (ticketId, residentId) => {
    const ticket = await MaintenanceTicket.findById(ticketId);

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

    try {
        const offer = await Offer.create({
            ticketId,
            technicianId,
            price: numericPrice,
            estimatedDuration: numericDuration,
            note,
        });

        await createNotification({
            userId: ticket.residentId,
            type: "NEW_OFFER",
            title: "New technician offer",
            message: `A technician submitted an offer for “${ticket.title}”.`,
            relatedId: ticketId,
        });

        return offer;
    } catch (error) {
        if (error.code === 11000) {
            const duplicateError = new Error(
                "You already made an offer for this ticket"
            );
            duplicateError.statusCode = 400;
            throw duplicateError;
        }

        throw error;
    }
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

    const ticket = await MaintenanceTicket.findById(
        offer.ticketId
    );

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "OPEN") {
        const error = new Error(
            "Offers can only be updated while the ticket is OPEN"
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

    const ticket = await MaintenanceTicket.findById(
        offer.ticketId
    );

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "OPEN") {
        const error = new Error(
            "Offers can only be withdrawn while the ticket is OPEN"
        );
        error.statusCode = 400;
        throw error;
    }

    const updatedOffer =
        await Offer.findOneAndUpdate(
            {
                _id: offerId,
                technicianId,
                status: "PENDING",
            },
            {
                $set: {
                    status: "WITHDRAWN",
                },
            },
            {
                new: true,
            }
        );

    if (!updatedOffer) {
        const error = new Error(
            "Offer is no longer pending"
        );
        error.statusCode = 400;
        throw error;
    }

    return updatedOffer;
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

    const ticket = await MaintenanceTicket.findOne({
        _id: offer.ticketId,
        residentId,
    });

    if (!ticket) {
        const existingTicket =
            await MaintenanceTicket.findById(
                offer.ticketId
            );

        if (!existingTicket) {
            const error = new Error("Ticket not found");
            error.statusCode = 404;
            throw error;
        }

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

    const latestNegotiation = await Negotiation.findOne({
        offerId: offer._id,
    }).sort({ createdAt: -1 });

    const finalPrice = latestNegotiation
        ? latestNegotiation.price
        : offer.price;

    // ---------------------------------------------------------------
    // CONCURRENCY GUARD
    // ---------------------------------------------------------------
    // The offer is the exclusive resource of this operation, so it is
    // claimed FIRST. `findOneAndUpdate({ status: "PENDING" })` is a single
    // atomic compare-and-set: of N simultaneous callers (double click, two
    // tabs, retried request) exactly ONE flips PENDING -> ACCEPTED. Every
    // other caller fails here, before any ticket mutation happens, so the
    // ticket can never be assigned by two racing requests.
    const acceptedOffer = await Offer.findOneAndUpdate(
        {
            _id: offer._id,
            status: "PENDING",
        },
        {
            $set: {
                status: "ACCEPTED",
                price: finalPrice,
            },
        },
        {
            new: true,
        }
    );

    if (!acceptedOffer) {
        const error = new Error(
            "Offer is no longer pending. Refresh the page and try again."
        );
        error.statusCode = 409;
        throw error;
    }

    // The ticket assignment is also a single conditional update. Accepting a
    // *different* offer for the same ticket at the same time is possible, so
    // this is what decides the winner: only the request that still sees
    // status OPEN assigns the ticket.
    const assignedTicket = await MaintenanceTicket.findOneAndUpdate(
        {
            _id: ticket._id,
            residentId,
            status: "OPEN",
        },
        {
            $set: {
                status: "ASSIGNED",
                assignedTo: offer.technicianId,
            },
        },
        {
            new: true,
        }
    );

    if (!assignedTicket) {
        // This request lost the race for the ticket. Release the claim it
        // placed on its own offer so the resident can still act on it.
        await Offer.findOneAndUpdate(
            {
                _id: acceptedOffer._id,
                status: "ACCEPTED",
            },
            {
                $set: {
                    status: "PENDING",
                    price: offer.price,
                },
            }
        );

        const error = new Error(
            "This ticket has already been assigned or changed. Refresh the page and try again."
        );
        error.statusCode = 409;
        throw error;
    }

    const rejectedOffers = await Offer.find({
        ticketId: offer.ticketId,
        _id: {
            $ne: offer._id,
        },
        status: "PENDING",
    }).select("_id technicianId");

    if (rejectedOffers.length > 0) {
        await Offer.updateMany(
            {
                ticketId: offer.ticketId,
                _id: {
                    $in: rejectedOffers.map(
                        (item) => item._id
                    ),
                },
                status: "PENDING",
            },
            {
                $set: {
                    status: "REJECTED",
                },
            }
        );
    }

    await createNotification({
        userId: acceptedOffer.technicianId,
        type: "OFFER_ACCEPTED",
        title: "Offer accepted",
        message: `Your offer for “${ticket.title}” was accepted.`,
        relatedId: ticket._id,
    });

    await Promise.all(
        rejectedOffers.map((rejectedOffer) =>
            createNotification({
                userId: rejectedOffer.technicianId,
                type: "OFFER_REJECTED",
                title: "Offer not selected",
                message: `Your offer for maintenance request "${ticket.title}" was not selected.`,
                relatedId: rejectedOffer._id,
            })
        )
    );

    return acceptedOffer;
};

module.exports = {
    getTicketOffers,
    createOffer,
    updateOffer,
    withdrawOffer,
    getMyOffers,
    acceptOffer,
};