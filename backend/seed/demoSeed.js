/**
 * Demo seed for CivicSync.
 *
 * Creates a small but complete compound dataset so the visitor-access flow
 * can be exercised end to end:
 *   - 2 buildings
 *   - a few units (some OCCUPIED, some VACANT)
 *   - 1 active resident (occupying a unit) + 1 vacant unit for registration
 *   - 1 active security officer
 *
 * Run with:  npm run seed:demo
 * (make sure DB_URI is set in .env and the database is reachable)
 */
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/user");
const Unit = require("../models/unit");
const Building = require("../models/building");

const DEMO_PASSWORD = "Password123";

const seedDemo = async () => {
  try {
    if (!process.env.DB_URI) {
      throw new Error("DB_URI is not configured");
    }

    await mongoose.connect(process.env.DB_URI);
    console.log("Database connected");

    // ---------- Buildings ----------
    const buildingsData = [
      { name: "Building A", buildingNumber: 1, floorsCount: 5, description: "Demo building A" },
      { name: "Building B", buildingNumber: 2, floorsCount: 4, description: "Demo building B" },
    ];

    const buildings = [];
    for (const data of buildingsData) {
      const building = await Building.findOneAndUpdate(
        { buildingNumber: data.buildingNumber },
        { $setOnInsert: data },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      buildings.push(building);
    }

    console.log(`Buildings ready: ${buildings.length}`);

    // ---------- Units ----------
    // Two occupied units (linked to the demo residents below) and two vacant.
    const unitPlan = [
      { building: buildings[0], unitNumber: 101, floor: 1, type: "APARTMENT", status: "OCCUPIED" },
      { building: buildings[0], unitNumber: 102, floor: 1, type: "APARTMENT", status: "VACANT" },
      { building: buildings[1], unitNumber: 201, floor: 2, type: "APARTMENT", status: "OCCUPIED" },
      { building: buildings[1], unitNumber: 202, floor: 2, type: "VILLA", status: "VACANT" },
    ];

    const units = [];
    for (const plan of unitPlan) {
      const unit = await Unit.findOneAndUpdate(
        { buildingId: plan.building._id, unitNumber: plan.unitNumber },
        {
          $setOnInsert: {
            buildingId: plan.building._id,
            unitNumber: plan.unitNumber,
            floor: plan.floor,
            type: plan.type,
            status: plan.status,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      units.push(unit);
    }

    console.log(`Units ready: ${units.length}`);

    const occupiedUnits = units.filter((unit) => unit.status === "OCCUPIED");

    // ---------- Users ----------
    const usersToSeed = [
      {
        name: "Demo Resident",
        email: "resident@compound.com",
        phone: "01000000001",
        role: "RESIDENT",
        unitId: occupiedUnits[0]?._id || null,
      },
      {
        name: "Second Resident",
        email: "resident2@compound.com",
        phone: "01000000002",
        role: "RESIDENT",
        unitId: occupiedUnits[1]?._id || null,
      },
      {
        name: "Demo Security",
        email: "security@compound.com",
        phone: "01000000003",
        role: "SECURITY",
        unitId: null,
      },
    ];

    for (const data of usersToSeed) {
      const existing = await User.findOne({ email: data.email });
      if (existing) {
        console.log(`User already exists: ${data.email}`);
        continue;
      }

      await User.create({
        ...data,
        password: DEMO_PASSWORD,
        status: "ACTIVE",
        specializations: [],
      });

      console.log(`User created: ${data.email}`);
    }

    console.log("\nDemo seed completed.");
    console.log(`Login password for all demo users: ${DEMO_PASSWORD}`);
    console.log("Resident: resident@compound.com");
    console.log("Security: security@compound.com");
  } catch (error) {
    console.error("Demo seed error:", error.message);
  } finally {
    await mongoose.connection.close();
  }
};

seedDemo();