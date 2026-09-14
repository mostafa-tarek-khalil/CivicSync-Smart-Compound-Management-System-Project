const express = require("express");

const {
    approveUser,
    rejectUser,
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.patch(
    "/users/:userId/approve",
    authMiddleware,
    roleMiddleware("ADMIN"),
    approveUser
);

router.patch(
    "/users/:userId/reject",
    authMiddleware,
    roleMiddleware("ADMIN"),
    rejectUser
);

module.exports = router;