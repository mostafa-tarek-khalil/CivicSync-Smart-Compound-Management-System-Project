const offerService = require("../services/offerService");

const createOffer = async (req, res) => {
    try {
        const offer = await offerService.createOffer(
            req.params.ticketId,
            req.user.userId,
            req.body
        );

        res.status(201).json({
            message: "Offer created successfully",
            offer,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message:
                error.message || "Failed to create offer",
        });
    }
};

const updateOffer = async (req, res) => {
    try {
        const offer = await offerService.updateOffer(
            req.params.id,
            req.user.userId,
            req.body
        );

        res.status(200).json({
            message: "Offer updated successfully",
            offer,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message:
                error.message || "Failed to update offer",
        });
    }
};

const withdrawOffer = async (req, res) => {
    try {
        const offer = await offerService.withdrawOffer(
            req.params.id,
            req.user.userId
        );

        res.status(200).json({
            message: "Offer withdrawn successfully",
            offer,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message:
                error.message || "Failed to withdraw offer",
        });
    }
};

const getTicketOffers = async (req, res) => {
    try {
        const offers = await offerService.getTicketOffers(
            req.params.ticketId,
            req.user.userId
        );

        res.status(200).json({
            count: offers.length,
            offers,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message:
                error.message || "Failed to get offers",
        });
    }
};

const getMyOffers = async (req, res) => {
    try {
        const offers = await offerService.getMyOffers(
            req.user.userId
        );

        res.status(200).json({
            count: offers.length,
            offers,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message:
                error.message || "Failed to get offers",
        });
    }
};

const acceptOffer = async (req, res) => {
    try {
        const offer = await offerService.acceptOffer(
            req.params.offerId,
            req.user.userId
        );

        res.status(200).json({
            message: "Offer accepted successfully",
            offer,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message:
                error.message || "Failed to accept offer",
        });
    }
};

module.exports = {
    createOffer,
    updateOffer,
    withdrawOffer,
    getTicketOffers,
    getMyOffers,
    acceptOffer,
};