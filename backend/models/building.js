const mongoose = require("mongoose");

const buildingSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        buildingNumber: {
            type: Number,
            required: true,
            min: 1,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },

        imageUrl: {
            type: String,
            trim: true,
            default: null,
        },

        floorsCount: {
            type: Number,
            required: true,
            min: 1,
        },

        unitsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

buildingSchema.index(
    { buildingNumber: 1 },
    { unique: true }
);

const Building =
    mongoose.model(
        "Building",
        buildingSchema
    );

module.exports = Building;