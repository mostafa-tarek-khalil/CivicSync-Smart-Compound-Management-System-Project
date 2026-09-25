const User = require("../models/user");
const { publicUrlFor } = require("../middleware/uploadMiddleware");

const handleError = (res, error) => {
    return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || "Upload failed",
    });
};

/**
 * Store a new profile picture for the signed-in user (any role) and return
 * the updated user payload so the client can refresh its cached avatar.
 */
const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            const error = new Error(
                "No image was uploaded. Send the file in the `image` field."
            );
            error.statusCode = 400;
            throw error;
        }

        const profileImage = publicUrlFor("profiles", req.file.filename);

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: { profileImage } },
            { new: true, runValidators: true }
        );

        if (!user) {
            const error = new Error("User not found");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: "Profile picture updated successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
                profileImage: user.profileImage,
                unitId: user.unitId,
                specializations: user.specializations,
                rating: user.rating,
                totalReviews: user.totalReviews,
                lastLoginAt: user.lastLoginAt,
            },
        });
    } catch (error) {
        return handleError(res, error);
    }
};

/** Upload an image to attach to a maintenance ticket. */
const uploadTicketAttachment = async (req, res) => {
    try {
        if (!req.file) {
            const error = new Error(
                "No image was uploaded. Send the file in the `image` field."
            );
            error.statusCode = 400;
            throw error;
        }

        return res.status(201).json({
            success: true,
            message: "Attachment uploaded successfully",
            data: {
                attachmentUrl: publicUrlFor("tickets", req.file.filename),
            },
        });
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    uploadProfileImage,
    uploadTicketAttachment,
};