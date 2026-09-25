require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const connectDB = require("./backend/config/db");
const authRoutes = require("./backend/routes/authRoutes");
const adminRoutes = require("./backend/routes/adminRoutes");
const visitRoutes = require("./backend/routes/visitRoutes");
const unitRoutes = require("./backend/routes/unitRoutes");
const chatRoutes = require("./backend/routes/chatRoutes");
const residentRoutes = require("./backend/routes/residentRoutes");
const technicianRoutes = require("./backend/routes/technicianRoutes");
const initializeChatSocket = require("./backend/socket/chatSocket");
const visitService = require("./backend/services/visitService");
const notificationRoutes = require("./backend/routes/notificationRoutes");
const uploadRoutes = require("./backend/routes/uploadRoutes");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// The Angular dev server is the default origin, but deployments set
// FRONTEND_URL (the same variable the password-reset e-mail already uses).
const FRONTEND_ORIGIN =
    process.env.FRONTEND_URL || "http://localhost:4200";

app.use(
    cors({
        origin: FRONTEND_ORIGIN,
    })
);

app.use(express.json());

// Uploaded avatars / ticket attachments are served straight off disk. The
// folder is created on demand by the upload middleware, so a missing folder
// never crashes the static mount.
app.use(
    "/uploads",
    express.static(path.join(__dirname, "backend", "uploads"))
);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/resident", residentRoutes);
app.use("/api/technician", technicianRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);


const io = new Server(server, {
    cors: {
        origin: FRONTEND_ORIGIN,
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

        // Periodically expire stale pending visits (OTP / QR windows).
        // Runs independently so the main request flow is never blocked.
        const EXPIRE_SWEEP_INTERVAL = 60 * 1000;

        setInterval(async () => {
            try {
                await visitService.expireStaleVisits();
            } catch (error) {
                console.error(
                    "Visit expiry sweep error:",
                    error.message
                );
            }
        }, EXPIRE_SWEEP_INTERVAL);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
};

startServer();
