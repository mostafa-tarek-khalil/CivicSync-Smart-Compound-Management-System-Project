const mongoose = require("mongoose");
const OfferModel = require("../models/offer");
const MaintenanceTicket = require("../models/maintenanceTicket");

const getTicketOffers = async (ticketId, residentId) => {
    const ticket = await MaintenanceTicket.findById(ticketId);

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.residentId.toString() !== residentId.toString()) {
        const error = new Error("You can only view offers for your own ticket");
        error.statusCode = 403;
        throw error;
    }

    const offers = await OfferModel.find({ ticketId });

    return offers;
};

const createOffer = async (ticketId, technicianId, { price, estimatedDuration, note }) => {

    if (!price || !estimatedDuration) {
        const error = new Error("price and estimatedDuration are required");
        error.statusCode = 400;
        throw error;
    }

    if (Number(price) < 0 || Number(estimatedDuration) <= 0) {
        const error = new Error("price must be 0 or greater and estimatedDuration must be greater than 0");
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
        const error = new Error("You can only make an offer on an open ticket");
        error.statusCode = 400;
        throw error;
    }

    const existingOffer = await OfferModel.findOne({
        ticketId,
        technicianId
    });

    if (existingOffer) {
        const error = new Error("You already made an offer for this ticket");
        error.statusCode = 400;
        throw error;
    }

    const offer = await OfferModel.create({
        ticketId,
        technicianId,
        price,
        estimatedDuration,
        note
    });

    return offer;
};

const withdrawOffer = async (offerId, technicianId) => {

    const offer = await OfferModel.findById(offerId);

    if (!offer) {
        const error = new Error("Offer not found");
        error.statusCode = 404;
        throw error;
    }

    if (offer.technicianId.toString() !== technicianId.toString()) {
        const error = new Error("You can only withdraw your own offer");
        error.statusCode = 403;
        throw error;
    }

    if (offer.status !== "PENDING") {
        const error = new Error("Only pending offers can be withdrawn");
        error.statusCode = 400;
        throw error;
    }

    offer.status = "WITHDRAWN";

    await offer.save();

    return offer;
};

const UpdateOffer = async (offerId , technicianId ,{ price, estimatedDuration, note })=>{
    const offer = await OfferModel.findById(offerId);

    if (!offer) {
        const error = new Error("Offer not found");
        error.statusCode = 404;
        throw error;
    }

    if (offer.technicianId.toString() !== technicianId.toString()) {
        const error = new Error("You can only update your own offer");
        error.statusCode = 403;
        throw error;
    }

    if (offer.status !== "PENDING") {
        const error = new Error("Only pending offers can be updated");
        error.statusCode = 400;
        throw error;
    }
   
    if (price !== undefined) {
        if (Number(price) < 0) {
            const error = new Error("Price cannot be negative");
            error.statusCode = 400;
            throw error;
        }

        offer.price = price;
    }

    if (estimatedDuration !== undefined) {
        if (Number(estimatedDuration) <= 0) {
            const error = new Error("Estimated duration must be greater than 0");
            error.statusCode = 400;
            throw error;
        }

        offer.estimatedDuration = estimatedDuration;
    }

    if (note !== undefined) {
        offer.note = note;
    }
    await offer.save();
    return offer;
};

const getMyOffers = async (technicianId) => {
    const offers = await OfferModel.find({
        technicianId
    });

    return offers;
};

const acceptOffer = async (offerId, residentId) => {
    const offer = await OfferModel.findById(offerId);

    if (!offer) {
        const error = new Error("Offer not found");
        error.statusCode = 404;
        throw error;
    }

    if (offer.status !== "PENDING") {
        const error = new Error("Only pending offers can be accepted");
        error.statusCode = 400;
        throw error;
    }

    const ticket = await MaintenanceTicket.findById(offer.ticketId);

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.residentId.toString() !== residentId.toString()) {
        const error = new Error("You can only accept offers for your own ticket");
        error.statusCode = 403;
        throw error;
    }

    offer.status = "ACCEPTED";
    await offer.save();

    await OfferModel.updateMany(
        {
            ticketId: offer.ticketId,
            _id: { $ne: offerId },
            status: "PENDING"
        },
        {
            $set: { status: "REJECTED" }
        }
    );

    return offer;
};
module.exports = {
  getTicketOffers , createOffer , withdrawOffer,UpdateOffer,getMyOffers,acceptOffer
};