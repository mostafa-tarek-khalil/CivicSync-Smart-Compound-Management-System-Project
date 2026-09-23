const express = require("express");

const router = express.Router();

const {
  getAvailableTickets,
  getAvailableTicketDetails,
  startTicket,
  resolveTicket,
  skipTicket,
  getAssignedTickets,
  getAssignedTicketDetails
} = require("../controllers/technicianController");

const { getTechnicianReviews } = require("../controllers/reviews");

const {
  createOffer,
  updateOffer,
  withdrawOffer,
  technicaianoffers,
} = require("../controllers/offerController");

const {
  getNegotiations,
  createNegotiation,
} = require("../controllers/negotiationController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware, roleMiddleware("TECHNICIAN"));

router.get("/available-tickets", getAvailableTickets);
router.get("/available-tickets/:id", getAvailableTicketDetails);
router.get("/assigned-tickets", getAssignedTickets);
router.get("/ticket/:id", getAssignedTicketDetails);

router.patch("/ticket/:id/start", startTicket);
router.patch("/ticket/:id/resolve", resolveTicket);
router.post("/ticket/:id/skip", skipTicket);

router.get("/reviews", getTechnicianReviews);

router.get("/offer/myoffers", technicaianoffers);
router.post("/ticket/:ticketId/offer", createOffer);
router.patch("/offer/:id", updateOffer);
router.patch("/offer/:id/withdraw", withdrawOffer);
router.get("/offer/:offerId/negotiations", getNegotiations);
router.post("/offer/:offerId/negotiations", createNegotiation);

module.exports = router;