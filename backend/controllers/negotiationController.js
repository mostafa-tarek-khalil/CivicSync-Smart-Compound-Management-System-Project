const negotiationService = require("../services/negotiationService");

const getNegotiations = async (req, res) => {
    try {
        const negotiations =
            await negotiationService.getNegotiations(
                req.params.offerId,
                req.user.userId,
                req.user.role
            );

        res.status(200).json({
            count: negotiations.length,
            negotiations,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message:
                error.message ||
                "Failed to get negotiations",
        });
    }
};

const createNegotiation = async (req, res) => {
    try {
        const negotiation =
            await negotiationService.createNegotiation(
                req.params.offerId,
                req.user.userId,
                req.user.role,
                req.body
            );

        res.status(201).json({
            message:
                "Negotiation message created successfully",
            negotiation,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message:
                error.message ||
                "Failed to create negotiation",
        });
    }
};

module.exports = {
    getNegotiations,
    createNegotiation,
};