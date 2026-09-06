const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
            default: null,
        },

        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },

        role: {
            type: String,
            enum: [
                "RESIDENT",
                "SECURITY",
                "TECHNICIAN",
                "ADMIN",
            ],
            required: true,
        },

        status: {
            type: String,
            enum: ["PENDING", "ACTIVE", "REJECTED"],
            default: "PENDING",
        },

        profileImage: {
            type: String,
            default: null,
        },

        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Unit",
            default: null,
        },

        specializations: {
            type: [
                {
                    type: String,
                    enum: [
                        "PLUMBING",
                        "ELECTRICITY",
                        "ELEVATOR",
                        "AC",
                        "GENERAL",
                    ],
                },
            ],
            default: [],
        },

        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },

        totalReviews: {
            type: Number,
            default: 0,
            min: 0,
        },

        lastLoginAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;