const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/notificationController");

const router = express.Router();
router.use(authMiddleware);
router.get("/", controller.list);
router.patch("/read-all", controller.markAllRead);
router.patch("/:id/read", controller.markRead);
router.delete("/:id", controller.remove);

module.exports = router;
