const express = require("express");

const { register, login, getMe, updateMe, forgotPassword, resetPassword, changePassword } = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.patch("/change-password", authMiddleware, changePassword);

module.exports = router;