const { io } = require("socket.io-client");

const VISITOR_CHAT_TOKEN =
    "ff0a53dabfd357ec38cda03c853cca98b219280bbfbd6b38e64172dc0c770e5d";

const VISIT_ID =
    "6aad486b8489db55eb78eb38";

const CONVERSATION_ID =
    "6aad48dd3c0c75b25581e66f";

const socket = io(
    "http://localhost:3000",
    {
        auth: {
            visitorChatToken:
                VISITOR_CHAT_TOKEN,
            visitId: VISIT_ID,
        },
    }
);

/*
 * Connected
 */
socket.on("connect", () => {
    console.log(
        "Visitor connected:",
        socket.id
    );

    socket.emit(
        "conversation:join",
        CONVERSATION_ID
    );
});

/*
 * Joined conversation
 */
socket.on(
    "conversation:joined",
    (data) => {
        console.log(
            "Visitor joined:",
            data
        );

        /*
         * Send Visitor message
         */
        socket.emit(
            "visitor:message:send",
            {
                conversationId:
                    CONVERSATION_ID,
                message:
                    "Hello from Visitor! This is a Socket.io test message.",
            }
        );
    }
);

/*
 * New message
 */
socket.on(
    "message:new",
    (data) => {
        console.log(
            "New message received:",
            data
        );
    }
);

/*
 * Chat error
 */
socket.on(
    "chat:error",
    (error) => {
        console.log(
            "Chat error:",
            error
        );
    }
);

/*
 * Connection error
 */
socket.on(
    "connect_error",
    (error) => {
        console.log(
            "Connection error:",
            error.message
        );
    }
);

/*
 * Disconnect
 */
socket.on(
    "disconnect",
    (reason) => {
        console.log(
            "Disconnected:",
            reason
        );
    }
);