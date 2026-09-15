const express = require("express");

const {
    // Flow 1
    createVisit,
    getMyVisits,
    getVisitById,
    generateVisitOtp,
    verifyVisitOtp,

    // Flow 2
    createVisitorRequest,
    generateVisitorRequestOtp,
    verifyVisitorRequestOtp,
    getResidentVisitorRequests,
    approveVisitorRequest,
    rejectVisitorRequest,

    // QR + Security
    generateVisitQr,
    scanVisitQr,
    checkInVisit,
    checkOutVisit,

    // Security
    getSecurityVisits,
    getSecurityVisitById,
} = require("../controllers/visitController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// --------------------------------------------------------------------------
// Visitor Request - Flow 2
// These endpoints are public because the visitor is not a User.
// --------------------------------------------------------------------------

router.post(
    "/visitor-requests",
    createVisitorRequest
);

router.post(
    "/visitor-requests/:id/otp",
    generateVisitorRequestOtp
);

router.post(
    "/visitor-requests/:id/otp/verify",
    verifyVisitorRequestOtp
);

// --------------------------------------------------------------------------
// Resident - Flow 2
// --------------------------------------------------------------------------

router.get(
    "/visitor-requests",
    authMiddleware,
    roleMiddleware("RESIDENT"),
    getResidentVisitorRequests
);

router.patch(
    "/visitor-requests/:id/approve",
    authMiddleware,
    roleMiddleware("RESIDENT"),
    approveVisitorRequest
);

router.patch(
    "/visitor-requests/:id/reject",
    authMiddleware,
    roleMiddleware("RESIDENT"),
    rejectVisitorRequest
);

// --------------------------------------------------------------------------
// Resident Invite - Flow 1
// --------------------------------------------------------------------------

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

// --------------------------------------------------------------------------
// Security
// --------------------------------------------------------------------------

router.post(
    "/scan",
    authMiddleware,
    roleMiddleware("SECURITY"),
    scanVisitQr
);

router.get(
    "/security/visits",
    authMiddleware,
    roleMiddleware("SECURITY"),
    getSecurityVisits
);

router.get(
    "/security/visits/:id",
    authMiddleware,
    roleMiddleware("SECURITY"),
    getSecurityVisitById
);

// --------------------------------------------------------------------------
// Resident - Visit Details / OTP / QR
// --------------------------------------------------------------------------

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

// --------------------------------------------------------------------------
// Security - Check In / Check Out
// --------------------------------------------------------------------------

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