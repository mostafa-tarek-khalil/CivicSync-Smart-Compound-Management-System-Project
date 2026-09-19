const { io } = require("socket.io-client");

// JWT of the Resident linked to the Visitor Visit
const TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTliMDRiYTU4OGNiYWUwOGViMzY1OWYiLCJyb2xlIjoiUkVTSURFTlQiLCJpYXQiOjE3ODk3NDU4NzgsImV4cCI6MTc4OTgzMjI3OH0.-YWZ1cUJct8D65xHP_h22n5YHvE575lSVxcCqVYK3zUذ";

const CONVERSATION_ID =
    "6aad48dd3c0c75b25581e66f";

const socket = io(
    "http://localhost:3000",
    {
        auth: {
            token: TOKEN,
        },
    }
);

socket.on("connect", () => {
    console.log(
        "Resident connected:",
        socket.id
    );

    socket.emit(
        "conversation:join",
        CONVERSATION_ID
    );
});

socket.on(
    "conversation:joined",
    (data) => {
        console.log(
            "Resident joined visitor conversation:",
            data
        );

        // Send message from Resident to Visitor
        socket.emit(
            "message:send",
            {
                conversationId:
                    CONVERSATION_ID,
                message:
                    "Hello from Resident! This is a Socket.io reply.",
            }
        );
    }
);

socket.on(
    "message:new",
    (data) => {
        console.log(
            "Resident received message:",
            data
        );

        if (
            data.message?.senderType ===
            "VISITOR"
        ) {
            console.log(
                "SUCCESS: Visitor message received by Resident!"
            );

            socket.emit(
                "conversation:read",
                CONVERSATION_ID
            );
        }
    }
);

socket.on(
    "messages:read",
    (data) => {
        console.log(
            "Messages read:",
            data
        );
    }
);

socket.on(
    "chat:error",
    (error) => {
        console.log(
            "Chat error:",
            error
        );
    }
);

socket.on(
    "connect_error",
    (error) => {
        console.log(
            "Connection error:",
            error.message
        );
    }
);

socket.on(
    "disconnect",
    (reason) => {
        console.log(
            "Disconnected:",
            reason
        );
    }
);