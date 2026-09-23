const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Unit = require("../models/unit");

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

    const normalizedEmail = email.trim().toLowerCase();

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

    const normalizedEmail = email.trim().toLowerCase();

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

module.exports = {
    registerUser,
    loginUser,
    getCurrentUser,
    updateCurrentUser,
};