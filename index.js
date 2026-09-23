require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./backend/config/db");
const authRoutes = require("./backend/routes/authRoutes");
const adminRoutes = require("./backend/routes/adminRoutes");
const visitRoutes = require("./backend/routes/visitRoutes");
const residentRoutes = require("./backend/routes/ResidentRoutes");
const technicianRoutes = require("./backend/routes/technicianRoutes");
const unitRoutes = require("./backend/routes/unitRoutes");
const chatRoutes = require("./backend/routes/chatRoutes");
const initializeChatSocket = require("./backend/socket/chatSocket");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

app.use(
    cors({
        origin: "http://localhost:4200",
    })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/visits", visitRoutes);

app.use("/api/resident",residentRoutes)
app.use("/api/technician",technicianRoutes)

app.use("/api/units", unitRoutes);
app.use("/api/chat", chatRoutes);


const io = new Server(server, {
    cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST", "PATCH"],
    },
});

initializeChatSocket(io);


app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Compound Management System API is running",
    });
});


const startServer = async () => {
    try {
        await connectDB();

        server.listen(PORT, () => {
            console.log(
                `Server is running successfully on port ${PORT}`
            );
        });
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
};

startServer();