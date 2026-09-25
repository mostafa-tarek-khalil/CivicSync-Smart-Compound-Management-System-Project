const express = require("express");

const {
    uploadProfileImage,
    uploadTicketAttachment,
} = require("../controllers/uploadController");

const authMiddleware = require("../middleware/authMiddleware");
const { createUploader } = require("../middleware/uploadMiddleware");

const router = express.Router();

const profileUpload = createUploader("profiles");
const ticketUpload = createUploader("tickets");

/**
 * Local upload endpoints.
 *
 * Both routes are authenticated: the caller must be a signed-in user, and the
 * profile route only ever writes the avatar of `req.user.userId` — a user can
 * never overwrite somebody else's picture.
 */
router.post(
    "/profile-image",
    authMiddleware,
    profileUpload.single("image"),
    uploadProfileImage
);

router.post(
    "/ticket-attachment",
    authMiddleware,
    ticketUpload.single("image"),
    uploadTicketAttachment
);

module.exports = router;