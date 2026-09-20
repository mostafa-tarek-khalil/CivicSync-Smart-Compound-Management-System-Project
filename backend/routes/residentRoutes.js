const express = require("express");

const {
    createTicket,
    getResidentTickets,
    getTicketDetails,
    closeTicket,
} = require("../controllers/maintenanceTicketController");

const {
    createReview,
    updateReview,
    deleteReview,
} = require("../controllers/reviewController");

const {
    getTicketOffers,
    acceptOffer,
} = require("../controllers/offerController");

const {
    getNegotiations,
    createNegotiation,
} = require("../controllers/negotiationController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(
    authMiddleware,
    roleMiddleware("RESIDENT")
);

router.get("/tickets", getResidentTickets);
router.post("/tickets", createTicket);
router.get("/tickets/:id", getTicketDetails);
router.patch("/tickets/:id/close", closeTicket);

router.get(
    "/tickets/:ticketId/offers",
    getTicketOffers
);

router.patch(
    "/offers/:offerId/accept",
    acceptOffer
);

router.get(
    "/offers/:offerId/negotiations",
    getNegotiations
);

router.post(
    "/offers/:offerId/negotiations",
    createNegotiation
);

router.post(
    "/tickets/:ticketId/review",
    createReview
);

router.patch(
    "/reviews/:id",
    updateReview
);

router.delete(
    "/reviews/:id",
    deleteReview
);

module.exports = router;