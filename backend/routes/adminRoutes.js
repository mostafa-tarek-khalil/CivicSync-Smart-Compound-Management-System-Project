const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
    getUsers,
    getUserById,
    approveUser,
    rejectUser,
    updateUser,
    getBuildings,
    createBuilding,
    updateBuilding,
    getUnits,
    createUnit,
    updateUnit,
    getInvoices,
    getInvoiceById,
    createInvoice,
    updateInvoiceStatus,
    getMaintenanceTickets,
    getMaintenanceTicketById,
    updateMaintenanceTicketStatus,
    getVisits,
    getVisitById,
    getDashboard,
    getReports,
    getFullReport,
    expireStaleVisits,
} = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("ADMIN"));
router.get("/dashboard", getDashboard);
router.get("/users", getUsers);
router.get("/users/:userId", getUserById);
router.patch("/users/:userId/approve", approveUser);
router.patch("/users/:userId/reject", rejectUser);
router.patch("/users/:userId", updateUser);
router.get("/buildings", getBuildings);
router.post("/buildings", createBuilding);
router.patch("/buildings/:buildingId", updateBuilding);
router.get("/units", getUnits);
router.post("/units", createUnit);
router.patch("/units/:unitId", updateUnit);
router.get("/invoices", getInvoices);
router.get("/invoices/:invoiceId", getInvoiceById);
router.post("/invoices", createInvoice);
router.patch("/invoices/:invoiceId/status", updateInvoiceStatus);
router.get("/maintenance", getMaintenanceTickets);
router.get("/maintenance/:ticketId", getMaintenanceTicketById);
router.patch("/maintenance/:ticketId/status", updateMaintenanceTicketStatus);
router.get("/visits", getVisits);
router.get("/visits/:visitId", getVisitById);
router.post("/visits/expire-stale", expireStaleVisits);
router.get("/reports", getReports);
router.get("/reports/full", getFullReport);

module.exports = router;