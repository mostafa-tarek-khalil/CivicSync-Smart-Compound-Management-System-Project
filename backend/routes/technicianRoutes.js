const express = require("express");

const router = express.Router();

const {
  getAvailableTickets,
  startTicket,
  resolveTicket,
  skipTicket,
  getAssignedTickets,
  getAssignedTicketDetails
} = require("../controllers/technicianController");

const {getTechnicianReviews} = require("../controllers/reviews");

const { createOffer,updateOffer,withdrawOffer,technicaianoffers,} = require("../controllers/offerController")

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware, roleMiddleware("TECHNICIAN"));

router.get("/available-tickets", getAvailableTickets);

router.get("/assigned-tickets", getAssignedTickets);

router.get("/ticket/:id", getAssignedTicketDetails);

router.patch("/ticket/:id/start", startTicket);

router.patch("/ticket/:id/resolve", resolveTicket);

router.post("/ticket/:id/skip", skipTicket);

router.get("/reviews",getTechnicianReviews);

router.get("/offer/myoffers",technicaianoffers);

router.post("/offer", createOffer);

router.patch("/offer/:offerId", updateOffer);

router.patch("/offer/:offerId/withdraw", withdrawOffer);

module.exports = router;