const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
    getUsers,
    getUserById,
    approveUser,
    rejectUser,

    getBuildings,
    createBuilding,
    updateBuilding,

    getUnits,
    createUnit,
    updateUnit,

    getInvoices,
    createInvoice,
    updateInvoiceStatus,

    getMaintenanceTickets,
    getMaintenanceTicketById,
    updateMaintenanceTicketStatus,

    getVisits,
    getVisitById,

    getDashboard,
    getReports,
} = require("../controllers/adminController");

const router = express.Router();


/*
=========================================================
ADMIN AUTHORIZATION
=========================================================
*/

router.use(
    authMiddleware,
    roleMiddleware("ADMIN")
);


/*
=========================================================
DASHBOARD
=========================================================
*/

router.get(
    "/dashboard",
    getDashboard
);


/*
=========================================================
USERS
=========================================================
*/

router.get(
    "/users",
    getUsers
);

router.get(
    "/users/:userId",
    getUserById
);

router.patch(
    "/users/:userId/approve",
    approveUser
);

router.patch(
    "/users/:userId/reject",
    rejectUser
);


/*
=========================================================
BUILDINGS
=========================================================
*/

router.get(
    "/buildings",
    getBuildings
);

router.post(
    "/buildings",
    createBuilding
);

router.patch(
    "/buildings/:buildingId",
    updateBuilding
);


/*
=========================================================
UNITS
=========================================================
*/

router.get(
    "/units",
    getUnits
);

router.post(
    "/units",
    createUnit
);

router.patch(
    "/units/:unitId",
    updateUnit
);


/*
=========================================================
INVOICES
=========================================================
*/

router.get(
    "/invoices",
    getInvoices
);

router.post(
    "/invoices",
    createInvoice
);

router.patch(
    "/invoices/:invoiceId/status",
    updateInvoiceStatus
);


/*
=========================================================
MAINTENANCE
=========================================================
*/

router.get(
    "/maintenance",
    getMaintenanceTickets
);

router.get(
    "/maintenance/:ticketId",
    getMaintenanceTicketById
);

router.patch(
    "/maintenance/:ticketId/status",
    updateMaintenanceTicketStatus
);


/*
=========================================================
VISITS
=========================================================
*/

router.get(
    "/visits",
    getVisits
);

router.get(
    "/visits/:visitId",
    getVisitById
);


/*
=========================================================
REPORTS
=========================================================
*/

router.get(
    "/reports",
    getReports
);


module.exports = router;