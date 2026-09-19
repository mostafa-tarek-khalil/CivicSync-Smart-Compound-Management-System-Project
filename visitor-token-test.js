require("dotenv").config();

const connectDB = require("./backend/config/db");
const visitService = require("./backend/services/visitService");

const VISIT_ID =
    "6aad486b8489db55eb78eb38";

const generateToken = async () => {
    try {
        await connectDB();

        const Visit = require("./backend/models/visit");

        const visit =
            await Visit.findById(VISIT_ID);

        if (!visit) {
            throw new Error("Visit not found");
        }

        const result =
            await visitService.generateVisitorChatTokenForVisit(
                visit
            );

        console.log(
            "Visitor Chat Token:"
        );

        console.log(result.token);

        console.log(
            "Expires At:"
        );

        console.log(result.expiresAt);

        process.exit(0);
    } catch (error) {
        console.error(
            "Error:",
            error.message
        );

        process.exit(1);
    }
};

generateToken();