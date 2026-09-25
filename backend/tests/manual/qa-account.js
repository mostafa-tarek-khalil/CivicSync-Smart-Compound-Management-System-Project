// Creates (or resets) a QA resident account with known credentials so the
// authenticated screens can be driven in a browser.
//
// Run from the project root:  node backend/tests/manual/qa-account.js create
//                             node backend/tests/manual/qa-account.js delete
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../../models/user");

const EMAIL = "qa.resident@civicsync.test";
const PASSWORD = "Password123";

(async () => {
    const action = process.argv[2] || "create";

    await mongoose.connect(process.env.DB_URI, {
        serverSelectionTimeoutMS: 10000,
    });

    try {
        if (action === "delete") {
            const result = await User.deleteMany({ email: EMAIL });
            console.log(`deleted ${result.deletedCount} QA account(s)`);
            return;
        }

        await User.deleteMany({ email: EMAIL });

        // The User schema hashes in a pre-save hook, so the plain password is
        // stored here and hashed by the model.
        const user = await User.create({
            name: "QA Resident",
            email: EMAIL,
            phone: "01000000077",
            password: PASSWORD,
            role: "RESIDENT",
            status: "ACTIVE",
        });

        console.log(`created ${user.email} (role ${user.role}, status ${user.status})`);
        console.log(`password: ${PASSWORD}`);
    } finally {
        await mongoose.disconnect();
    }
})();