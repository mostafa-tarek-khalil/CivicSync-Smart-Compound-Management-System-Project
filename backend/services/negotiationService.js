const Negotiation = require("../models/negotiation");
const OfferModel = require("../models/offer");
const MaintenanceTicket = require("../models/maintenanceTicket");

const assertCanAccessOffer = async (offerId, userId, role, { requireOpen = false } = {}) => {
  const offer = await OfferModel.findById(offerId);

  if (!offer) {
    const error = new Error("Offer not found");
    error.statusCode = 404;
    throw error;
  }

  const ticket = await MaintenanceTicket.findById(offer.ticketId);

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  if (role === "RESIDENT") {
    if (ticket.residentId.toString() !== userId.toString()) {
      const error = new Error("You can only negotiate on offers for your own ticket");
      error.statusCode = 403;
      throw error;
    }
  } else if (role === "TECHNICIAN") {
    if (offer.technicianId.toString() !== userId.toString()) {
      const error = new Error("You can only negotiate on your own offer");
      error.statusCode = 403;
      throw error;
    }
  } else {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  if (requireOpen) {
    if (offer.status !== "PENDING") {
      const error = new Error("You can only negotiate on a pending offer");
      error.statusCode = 400;
      throw error;
    }

    if (ticket.status !== "OPEN") {
      const error = new Error("This ticket is no longer open for negotiation");
      error.statusCode = 400;
      throw error;
    }
  }

  return { offer, ticket };
};

const getNegotiations = async (offerId, userId, role) => {
  await assertCanAccessOffer(offerId, userId, role);

  return await Negotiation.find({ offerId })
    .populate("senderId", "name")
    .sort({ createdAt: 1 });
};

const createNegotiation = async (offerId, userId, role, { price, message }) => {
  if (price === undefined || price === null || Number(price) < 0) {
    const error = new Error("A valid price is required");
    error.statusCode = 400;
    throw error;
  }

  const { offer } = await assertCanAccessOffer(offerId, userId, role, {
    requireOpen: true,
  });

  const negotiation = await Negotiation.create({
    offerId,
    senderId: userId,
    senderRole: role,
    price: Number(price),
    message: message || null,
  });

  offer.price = Number(price);
  await offer.save();

  return await negotiation.populate("senderId", "name");
};

module.exports = {
  getNegotiations,
  createNegotiation,
};
