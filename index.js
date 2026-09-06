require("dotenv").config();

const express = require("express");
const connectDB = require("./backend/config/db");
const authRoutes = require("./backend/routes/authRoutes");
const adminRoutes = require("./backend/routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);


app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Compound Management System API is running",
  });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running successfully on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

startServer();