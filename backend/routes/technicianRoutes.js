const express = require("express");

const {
    getAvailableTickets,
    startTicket,
    resolveTicket,
    skipTicket,
    getAssignedTickets,
    getAssignedTicketDetails,
} = require("../controllers/technicianController");

const {
    getTechnicianReviews,
} = require("../controllers/reviewController");

const {
    createOffer,
    updateOffer,
    withdrawOffer,
    getMyOffers,
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
    roleMiddleware("TECHNICIAN")
);

router.get(
    "/available-tickets",
    getAvailableTickets
);

router.get(
    "/assigned-tickets",
    getAssignedTickets
);

router.get(
    "/tickets/:id",
    getAssignedTicketDetails
);

router.patch(
    "/tickets/:id/start",
    startTicket
);

router.patch(
    "/tickets/:id/resolve",
    resolveTicket
);

router.post(
    "/tickets/:id/skip",
    skipTicket
);

router.get(
    "/reviews",
    getTechnicianReviews
);

router.get(
    "/offers/my",
    getMyOffers
);

router.post(
    "/tickets/:ticketId/offers",
    createOffer
);

router.patch(
    "/offers/:id",
    updateOffer
);

router.patch(
    "/offers/:id/withdraw",
    withdrawOffer
);

router.get(
    "/offers/:offerId/negotiations",
    getNegotiations
);

router.post(
    "/offers/:offerId/negotiations",
    createNegotiation
);

module.exports = router;