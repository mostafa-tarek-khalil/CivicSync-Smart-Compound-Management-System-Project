const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/user");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const seedAdmin = async () => {
  try {
    if (!process.env.DB_URI) {
      throw new Error("DB_URI is not configured");
    }

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD are required"
      );
    }

    await mongoose.connect(process.env.DB_URI);

    console.log("Database connected");

    const existingAdmin = await User.findOne({
      role: "ADMIN",
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      return;
    }

    const admin = await User.create({
      name: "System Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "ADMIN",
      status: "ACTIVE",
      phone: null,
      profileImage: null,
      unitId: null,
      specializations: [],
    });

    console.log("Admin created successfully");

    console.log({
      id: admin._id,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    });
  } catch (error) {
    console.error("Admin seed error:", error.message);
  } finally {
    await mongoose.connection.close();
  }
};

seedAdmin();