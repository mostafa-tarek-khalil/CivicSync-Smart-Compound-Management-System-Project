const express = require("express");

const {
    createVisit,
    getMyVisits,
    getVisitById,
    generateVisitOtp,
    verifyVisitOtp,
    createVisitorRequest,
    getVisitorUnits,
    getVisitorRequestStatus,
    lookupVisitorRequests,
    generateVisitorRequestQr,
    generateVisitorRequestOtp,
    verifyVisitorRequestOtp,
    getResidentVisitorRequests,
    approveVisitorRequest,
    rejectVisitorRequest,
    generateVisitQr,
    scanVisitQr,
    checkInVisit,
    checkOutVisit,
    getSecurityVisits,
    getSecurityVisitById,
} = require("../controllers/visitController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/visitor-requests", createVisitorRequest);
router.get("/visitor-units", getVisitorUnits);
router.post("/visitor-requests/:id/otp", generateVisitorRequestOtp);
router.post("/visitor-requests/:id/otp/verify", verifyVisitorRequestOtp);
router.get("/visitor-requests/lookup", lookupVisitorRequests);
router.get("/visitor-requests/:id/status", getVisitorRequestStatus);
router.post("/visitor-requests/:id/qr", generateVisitorRequestQr);
router.get("/visitor-requests", authMiddleware, roleMiddleware("RESIDENT"), getResidentVisitorRequests);
router.patch("/visitor-requests/:id/approve", authMiddleware, roleMiddleware("RESIDENT"), approveVisitorRequest);
router.patch("/visitor-requests/:id/reject", authMiddleware, roleMiddleware("RESIDENT"), rejectVisitorRequest);
router.post("/", authMiddleware, roleMiddleware("RESIDENT"), createVisit);
router.get("/", authMiddleware, roleMiddleware("RESIDENT"), getMyVisits);
router.post("/scan", authMiddleware, roleMiddleware("SECURITY"), scanVisitQr);
router.get("/security/visits", authMiddleware, roleMiddleware("SECURITY"), getSecurityVisits);
router.get("/security/visits/:id", authMiddleware, roleMiddleware("SECURITY"), getSecurityVisitById)
router.get("/:id", authMiddleware, roleMiddleware("RESIDENT"), getVisitById);
router.post("/:id/otp", authMiddleware, roleMiddleware("RESIDENT"), generateVisitOtp)
router.post("/:id/otp/verify", authMiddleware, roleMiddleware("RESIDENT"), verifyVisitOtp);
router.post("/:id/qr", authMiddleware, roleMiddleware("RESIDENT"), generateVisitQr);
router.patch("/:id/check-in", authMiddleware, roleMiddleware("SECURITY"), checkInVisit);
router.patch( "/:id/check-out", authMiddleware, roleMiddleware("SECURITY"), checkOutVisit);

module.exports = router;
