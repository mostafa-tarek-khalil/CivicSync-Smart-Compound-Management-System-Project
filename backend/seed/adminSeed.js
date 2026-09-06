const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");

const ADMIN_EMAIL = "admin@compound.com";
const ADMIN_PASSWORD = "Admin1234";

const seedAdmin = async () => {
  try {
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