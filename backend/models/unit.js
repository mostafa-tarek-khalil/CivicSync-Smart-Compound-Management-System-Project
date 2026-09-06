const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
    {
        buildingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Building",
            required: true,
        },

        unitNumber: {
            type: Number,
            required: true,
            min: 1,
        },

        floor: {
            type: Number,
            required: true,
            min: 0,
        },

        type: {
            type: String,
            enum: ["APARTMENT", "VILLA"],
            required: true,
        },

        status: {
            type: String,
            enum: ["OCCUPIED", "VACANT"],
            default: "VACANT",
        },
    },
    {
        timestamps: true,
    }
);

unitSchema.index(
    { buildingId: 1, unitNumber: 1 },
    { unique: true }
);

const Unit = mongoose.model("Unit", unitSchema);

module.exports = Unit;