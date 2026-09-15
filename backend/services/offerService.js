const mongoose = require("mongoose");
const Offer = require("../models/offer");
const MaintenanceTicket = require("../models/maintenanceTicket");

const createOffer = async (ticketId, technicianId, { price, estimatedDuration, note }) => {
  if (price === undefined || estimatedDuration === undefined) {
    const error = new Error("price and estimatedDuration are required");
    error.statusCode = 400;
    throw error;
  }

  if (Number(price) <= 0 || Number(estimatedDuration) <= 0) {
    const error = new Error("price and estimatedDuration must be greater than zero");
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
    const error = new Error("Only OPEN tickets can receive offers");
    error.statusCode = 400;
    throw error;
  }

  const existingOffer = await Offer.findOne({ ticketId, technicianId });
  if (existingOffer) {
    const error = new Error("You already submitted an offer for this ticket");
    error.statusCode = 400;
    throw error;
  }

  return await Offer.create({
    ticketId,
    technicianId,
    price,
    estimatedDuration,
    note,
  });
};

const updateOffer = async (offerId, technicianId, updateData) => {
  const offer = await Offer.findOne({ _id: offerId, technicianId });

  if (!offer) {
    const error = new Error("Offer not found");
    error.statusCode = 404;
    throw error;
  }

  if (offer.status !== "PENDING") {
    const error = new Error("Only PENDING offers can be updated");
    error.statusCode = 400;
    throw error;
  }

  if (updateData.price !== undefined) {
    if (Number(updateData.price) <= 0) {
      const error = new Error("Price must be greater than zero");
      error.statusCode = 400;
      throw error;
    }
    offer.price = updateData.price;
  }

  if (updateData.estimatedDuration !== undefined) {
    if (Number(updateData.estimatedDuration) <= 0) {
      const error = new Error("Estimated duration must be greater than zero");
      error.statusCode = 400;
      throw error;
    }
    offer.estimatedDuration = updateData.estimatedDuration;
  }

  if (updateData.note !== undefined) {
    offer.note = updateData.note;
  }

  return await offer.save();
};

const withdrawOffer = async (offerId, technicianId) => {
  const offer = await Offer.findOne({ _id: offerId, technicianId });

  if (!offer) {
    const error = new Error("Offer not found");
    error.statusCode = 404;
    throw error;
  }

  if (offer.status !== "PENDING") {
    const error = new Error("Only PENDING offers can be withdrawn");
    error.statusCode = 400;
    throw error;
  }

  offer.status = "WITHDRAWN";
  return await offer.save();
};

const getTicketOffers = async (ticketId, residentId) => {
  const ticket = await MaintenanceTicket.findOne({ _id: ticketId, residentId });

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  return await Offer.find({ ticketId, status: "PENDING" })
    .populate("technicianId", "name")
    .sort({ createdAt: -1 });
};

const acceptOffer = async (offerId, residentId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const offer = await Offer.findById(offerId).session(session);

    if (!offer) {
      const error = new Error("Offer not found");
      error.statusCode = 404;
      throw error;
    }

    if (offer.status !== "PENDING") {
      const error = new Error("Only PENDING offers can be accepted");
      error.statusCode = 400;
      throw error;
    }

    const ticket = await MaintenanceTicket.findOne({
      _id: offer.ticketId,
      residentId,
    }).session(session);

    if (!ticket) {
      const error = new Error("Ticket not found or not yours");
      error.statusCode = 404;
      throw error;
    }

    if (ticket.status !== "OPEN") {
      const error = new Error("Only OPEN tickets can accept offers");
      error.statusCode = 400;
      throw error;
    }

    offer.status = "ACCEPTED";
    await offer.save({ session });

    ticket.assignedTo = offer.technicianId;
    ticket.status = "ASSIGNED";
    await ticket.save({ session });

    await Offer.updateMany(
      {
        ticketId: ticket._id,
        _id: { $ne: offer._id },
        status: "PENDING",
      },
      { $set: { status: "REJECTED" } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // TODO: Notification hooks (Technician Accepted, Other Technicians Rejected)
    return { offer, ticket };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

module.exports = {
  createOffer,
  updateOffer,
  withdrawOffer,
  getTicketOffers,
  acceptOffer,
};