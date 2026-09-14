const express = require("express");

const {
    createVisit,
    getMyVisits,
    getVisitById,
    generateVisitOtp,
    verifyVisitOtp,
    generateVisitQr,
    scanVisitQr,
    checkInVisit,
    checkOutVisit,
} = require("../controllers/visitController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    roleMiddleware("RESIDENT"),
    createVisit
);

router.get(
    "/",
    authMiddleware,
    roleMiddleware("RESIDENT"),
    getMyVisits
);

router.post(
    "/scan",
    authMiddleware,
    roleMiddleware("SECURITY"),
    scanVisitQr
);

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("RESIDENT"),
    getVisitById
);

router.post(
    "/:id/otp",
    authMiddleware,
    roleMiddleware("RESIDENT"),
    generateVisitOtp
);

router.post(
    "/:id/otp/verify",
    authMiddleware,
    roleMiddleware("RESIDENT"),
    verifyVisitOtp
);

router.post(
    "/:id/qr",
    authMiddleware,
    roleMiddleware("RESIDENT"),
    generateVisitQr
);

router.patch(
    "/:id/check-in",
    authMiddleware,
    roleMiddleware("SECURITY"),
    checkInVisit
);

router.patch(
    "/:id/check-out",
    authMiddleware,
    roleMiddleware("SECURITY"),
    checkOutVisit
);

module.exports = router;