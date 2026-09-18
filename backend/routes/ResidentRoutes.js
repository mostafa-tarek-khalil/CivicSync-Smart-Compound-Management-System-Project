const express = require("express");

const router = express.Router();

const {
    createTicket, getResidentTickets,
    getTicketDetails,closeTicket,
} = require("../controllers/maintenanceTicketController");

const { createReview,updateReview, deleteReview,} = require("../controllers/reviews");

const {
    getTicketOffers,acceptOffer
} = require("../controllers/offerController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware, roleMiddleware("RESIDENT"));

router.get("/tickets", getResidentTickets);
router.post("/tickets", createTicket);
router.get("/tickets/:ticketId", getTicketDetails);
router.patch("/tickets/:ticketId/close", closeTicket);

router.patch("/offer/:offerId/accept", acceptOffer);
router.get("/offer/ticket/:ticketId", getTicketOffers);

router.post("/review", createReview);
router.patch("/review/:reviewId", updateReview);
router.delete("/review/:reviewId", deleteReview);

module.exports = router;