const express = require("express");

const { approveUser, rejectUser, } = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.patch("/users/:userId/approve", authMiddleware, adminMiddleware, approveUser);

router.patch("/users/:userId/reject", authMiddleware, adminMiddleware, rejectUser);

module.exports = router;