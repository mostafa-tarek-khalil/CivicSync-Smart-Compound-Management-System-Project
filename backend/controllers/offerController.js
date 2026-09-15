const Offer = require("../models/offer");
const MaintenanceTicket = require("../models/maintenanceTicket");

// Technician creates an offer
const createOffer = async (req, res) => {
  try {
    const { price, estimatedDuration, note } = req.body;

    if (!price || !estimatedDuration) {
      return res.status(400).json({
        message: "price and estimatedDuration are required",
      });
    }

    const ticket = await MaintenanceTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (ticket.status !== "OPEN") {
      return res.status(400).json({
        message: "Only OPEN tickets can receive offers",
      });
    }

    const existingOffer = await Offer.findOne({
      ticketId: req.params.ticketId,
      technicianId: req.user.userId,
    });

    if (existingOffer) {
      return res.status(400).json({
        message: "You already submitted an offer for this ticket",
      });
    }

    const offer = await Offer.create({
      ticketId: req.params.ticketId,
      technicianId: req.user.userId,
      price,
      estimatedDuration,
      note,
    });

    res.status(201).json({
      message: "Offer created successfully",
      offer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create offer",
      error: error.message,
    });
  }
};


// Technician updates his offer
const updateOffer = async (req, res) => {
  try {
    const { price, estimatedDuration, note } = req.body;

    const offer = await Offer.findOne({
      _id: req.params.id,
      technicianId: req.user.userId,
    });

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found",
      });
    }

    if (offer.status !== "PENDING") {
      return res.status(400).json({
        message: "Only PENDING offers can be updated",
      });
    }

    offer.price = price;
    offer.estimatedDuration = estimatedDuration;
    offer.note = note;

    await offer.save();

    res.status(200).json({
      message: "Offer updated successfully",
      offer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update offer",
      error: error.message,
    });
  }
};


// Technician withdraws his offer
const withdrawOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({
      _id: req.params.id,
      technicianId: req.user.userId,
    });

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found",
      });
    }

    if (offer.status !== "PENDING") {
      return res.status(400).json({
        message: "Only PENDING offers can be withdrawn",
      });
    }

    offer.status = "WITHDRAWN";

    await offer.save();

    res.status(200).json({
      message: "Offer withdrawn successfully",
      offer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to withdraw offer",
      error: error.message,
    });
  }
};


// Resident gets offers for his ticket
const getTicketOffers = async (req, res) => {
  try {
    const ticket = await MaintenanceTicket.findOne({
      _id: req.params.ticketId,
      residentId: req.user.userId,
    });

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    const offers = await Offer.find({
      ticketId: req.params.ticketId,
      status: "PENDING",
    })
      .populate("technicianId", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: offers.length,
      offers,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get offers",
      error: error.message,
    });
  }
};


// Resident accepts an offer
const acceptOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found",
      });
    }

    if (offer.status !== "PENDING") {
      return res.status(400).json({
        message: "Only PENDING offers can be accepted",
      });
    }

    const ticket = await MaintenanceTicket.findOne({
      _id: offer.ticketId,
      residentId: req.user.userId,
    });

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found or not yours",
      });
    }

    if (ticket.status !== "OPEN") {
      return res.status(400).json({
        message: "Only OPEN tickets can accept offers",
      });
    }

    // Accept selected offer
    offer.status = "ACCEPTED";

    // Assign technician to ticket
    ticket.assignedTo = offer.technicianId;
    ticket.status = "ASSIGNED";

    await offer.save();
    await ticket.save();

    // Reject other pending offers
    await Offer.updateMany(
      {
        ticketId: ticket._id,
        _id: { $ne: offer._id },
        status: "PENDING",
      },
      {
        $set: {
          status: "REJECTED",
        },
      }
    );

    res.status(200).json({
      message: "Offer accepted successfully",
      offer,
      ticket,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to accept offer",
      error: error.message,
    });
  }
};


module.exports = {
  createOffer,
  updateOffer,
  withdrawOffer,
  getTicketOffers,
  acceptOffer,
};