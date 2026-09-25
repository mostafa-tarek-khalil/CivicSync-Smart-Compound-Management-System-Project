const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTliMDRiYTU4OGNiYWUwOGViMzY1OWYiLCJyb2xlIjoiUkVTSURFTlQiLCJpYXQiOjE3ODk3NDI5NDYsImV4cCI6MTc4OTgyOTM0Nn0.vhdEFTg2Q0_pVsdEEqOkryXrBZRXNXsrBbDoEJPKsuE";

const socket = io("http://localhost:3000", {
    auth: {
        token: TOKEN,
    },
});

socket.on("connect", () => {
    console.log("Connected:", socket.id);

    socket.emit(
        "conversation:join",
        "6aad48dd3c0c75b25581e66f"
    );
});

socket.on("conversation:joined", (data) => {
    console.log("Joined conversation:", data);

    socket.emit("message:send", {
        conversationId: data.conversationId,
        message: "Hello from Socket.io",
    });
});

socket.on("message:new", (data) => {
    console.log("New message:", data);
});

socket.on("chat:error", (error) => {
    console.log("Chat error:", error);
});

socket.on("connect_error", (error) => {
    console.log("Connection error:", error.message);
});

socket.on("disconnect", (reason) => {
    console.log("Disconnected:", reason);
});