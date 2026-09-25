const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user");
const Unit = require("../models/unit");
const { sendPasswordResetEmail } = require("./emailService");

const PASSWORD_RESET_TTL = 15 * 60 * 1000;

/**
 * Single place where e-mails are normalised. Keeping this in one helper
 * guarantees register / login / password-reset all agree on the stored form.
 */
const normalizeEmail = (email) =>
    typeof email === "string" ? email.trim().toLowerCase() : "";

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

const registerUser = async (userData) => {
    const {
        name,
        email,
        phone,
        password,
        role,
        unitId,
        specializations,
    } = userData;

    if (!name || !email || !password || !role) {
        throw new Error(
            "Name, email, password and role are required"
        );
    }

    if (password.length < 8) {
        throw new Error(
            "Password must be at least 8 characters"
        );
    }

    const allowedRoles = [
        "RESIDENT",
        "SECURITY",
        "TECHNICIAN",
    ];

    if (!allowedRoles.includes(role)) {
        throw new Error("Invalid registration role");
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({
        email: normalizedEmail,
    });

    if (existingUser) {
        throw new Error("Email is already registered");
    }

    if (role === "RESIDENT") {
        if (!unitId) {
            throw new Error("Unit is required for residents");
        }

        const unit = await Unit.findById(unitId);

        if (!unit) {
            throw new Error("Unit not found");
        }

        if (unit.status === "OCCUPIED") {
            throw new Error("Unit is already occupied");
        }
    }

    if (role === "TECHNICIAN") {
        if (
            !Array.isArray(specializations) ||
            specializations.length === 0
        ) {
            throw new Error(
                "At least one specialization is required for technicians"
            );
        }
    }

    try {
        const user = await User.create({
            name,
            email: normalizedEmail,
            phone,
            password,
            role,
            unitId: role === "RESIDENT" ? unitId : null,
            specializations:
                role === "TECHNICIAN"
                    ? specializations
                    : [],
            status: "PENDING",
        });

        return user;
    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern?.unitId) {
                throw new Error(
                    "Unit is already reserved by another resident"
                );
            }

            if (error.keyPattern?.email) {
                throw new Error(
                    "Email is already registered"
                );
            }
        }

        throw error;
    }
};

const loginUser = async (email, password) => {
    if (!email || !password) {
        throw new Error(
            "Email and password are required"
        );
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
        email: normalizedEmail,
    }).select("+password");

    if (!user) {
        throw new Error("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
        throw new Error("Account is not active");
    }

    const isPasswordCorrect =
        await bcrypt.compare(
            password,
            user.password
        );

    if (!isPasswordCorrect) {
        throw new Error("Invalid email or password");
    }

    user.lastLoginAt = new Date();

    await user.save();

    const token = jwt.sign(
        {
            userId: user._id,
            role: user.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d",
        }
    );

    return {
        user,
        token,
    };
};

const getCurrentUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    return user;
};

const updateCurrentUser = async (userId, updates = {}) => {
    const allowedFields = ["name", "phone", "profileImage"];

    const sanitized = {};
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            sanitized[field] = updates[field];
        }
    }

    if (sanitized.name !== undefined) {
        if (typeof sanitized.name !== "string" || sanitized.name.trim().length < 2) {
            throw new Error("Name must be at least 2 characters");
        }
        sanitized.name = sanitized.name.trim();
    }

    if (Object.keys(sanitized).length === 0) {
        throw new Error("No valid fields to update");
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: sanitized },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new Error("User not found");
    }

    return user;
};

/**
 * Start the forgot-password flow.
 *
 * Always resolves the same way whether or not the address exists, so the
 * endpoint cannot be used to enumerate registered accounts.
 */
const requestPasswordReset = async (email) => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        const error = new Error("Email is required");
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        return { sent: false };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL);

    await user.save();

    try {
        await sendPasswordResetEmail(user.email, rawToken);
    } catch (error) {
        // Never leak mail-transport failures as a valid/invalid account signal.
        console.error("Failed to send password reset email:", error.message);
    }

    return { sent: true };
};

/** Complete the reset flow with the token from the e-mail link. */
const resetPassword = async (token, password) => {
    if (!token || typeof token !== "string") {
        const error = new Error("Reset token is required");
        error.statusCode = 400;
        throw error;
    }

    if (!password || typeof password !== "string" || password.length < 8) {
        const error = new Error("Password must be at least 8 characters");
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findOne({
        passwordResetTokenHash: hashToken(token),
        passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
        const error = new Error("Reset link is invalid or has expired");
        error.statusCode = 400;
        throw error;
    }

    user.password = password;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;

    await user.save();

    return { email: user.email };
};

/**
 * Change the password of an already signed-in user.
 *
 * The current password is verified against the stored hash before the new one
 * is written, so a stolen session token alone cannot silently rotate the
 * password.
 */
const changePassword = async (userId, currentPassword, newPassword) => {
    if (!currentPassword || typeof currentPassword !== "string") {
        const error = new Error("Current password is required");
        error.statusCode = 400;
        throw error;
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        const error = new Error("New password must be at least 8 characters");
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const isCorrect = await bcrypt.compare(currentPassword, user.password);

    if (!isCorrect) {
        const error = new Error("Current password is incorrect");
        error.statusCode = 400;
        throw error;
    }

    user.password = newPassword;
    await user.save();

    return { email: user.email };
};

module.exports = {
    registerUser,
    loginUser,
    getCurrentUser,
    updateCurrentUser,
    requestPasswordReset,
    resetPassword,
    changePassword,
    normalizeEmail,
};