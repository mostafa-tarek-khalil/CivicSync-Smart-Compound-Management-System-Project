// Creates (or resets) a QA technician account with known credentials so the
// technician screens can be driven in a browser.
//
// Run from the project root:  node backend/tests/manual/qa-technician.js create
//                             node backend/tests/manual/qa-technician.js delete
require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");

// This machine's resolver refuses SRV lookups (`querySrv ECONNREFUSED`) even
// though `mongodb+srv://` needs one. Pointing Node at public resolvers lets the
// helper connect. Scoped to this script so app runtime behaviour is untouched.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const User = require("../../models/user");

const EMAIL = "qa.technician@civicsync.test";
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
            name: "QA Technician",
            email: EMAIL,
            phone: "01000000088",
            password: PASSWORD,
            role: "TECHNICIAN",
            specializations: ["PLUMBING", "ELECTRICITY"],
            status: "ACTIVE",
        });

        console.log(`created ${user.email} (role ${user.role}, status ${user.status})`);
        console.log(`password: ${PASSWORD}`);
    } finally {
        await mongoose.disconnect();
    }
})();