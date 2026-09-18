const express = require("express");

const router = express.Router();

const {
    createTicket,
    getResidentTickets,
    getTicketDetails,
    closeTicket,
} = require("../controllers/maintenanceTicketController");

const { createReview, updateReview, deleteReview } = require("../controllers/reviews");

const {
    getTicketOffers,
    acceptOffer
} = require("../controllers/offerController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware, roleMiddleware("RESIDENT"));

router.get("/tickets", getResidentTickets);
router.post("/tickets", createTicket);
router.get("/tickets/:id", getTicketDetails);
router.patch("/tickets/:id/close", closeTicket);

router.patch("/offer/:offerId/accept", acceptOffer);
router.get("/offer/ticket/:ticketId", getTicketOffers);

router.post("/tickets/:ticketId/review", createReview);
router.patch("/review/:id", updateReview);
router.delete("/review/:id", deleteReview);

module.exports = router;