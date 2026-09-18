const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWFjM2I2N2Y5ZGQ4ZDc5MjJiYzRmYjIiLCJyb2xlIjoiUkVTSURFTlQiLCJpYXQiOjE3ODk3NDM2NjYsImV4cCI6MTc4OTgzMDA2Nn0.9aUdttGjy4z3y4c2pNO9RPJCUR-XVkscHIbI0qXIqSw";

const socket = io("http://localhost:3000", {
    auth: {
        token: TOKEN,
    },
});

socket.on("connect", () => {
    console.log("Resident 2 connected:", socket.id);

    socket.emit(
        "conversation:join",
        "6aad44d3647874400307fab6"
    );
});

socket.on("conversation:joined", (data) => {
    console.log("Resident 2 joined:", data);

    // Mark existing messages as read
    socket.emit(
        "conversation:read",
        data.conversationId
    );
});

socket.on("message:new", (data) => {
    console.log("Message received:", data);

    console.log(
        "Marking conversation as read:",
        data.message.conversationId
    );

    socket.emit(
        "conversation:read",
        data.message.conversationId
    );
});

socket.on("messages:read", (data) => {
    console.log("Messages read:", data);
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