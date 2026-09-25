// Backend API probe: checks the LIVE server on port 3000 with real tokens for
// every role, then removes the temporary users/tickets it created.
// Run from the project root:  node backend/tests/manual/api-probe.js
require("dotenv").config();
const mongoose = require("mongoose");

// Relative to this file (backend/tests/manual/), hence the ../../ hop.
const User = require("../../models/user");
const MaintenanceTicket = require("../../models/maintenanceTicket");
const Offer = require("../../models/offer");

const BASE = "http://127.0.0.1:3000/api";
const PASSWORD = "Password123";

const tempEmails = [
    "probe.tech@civicsync.test",
    "probe.resident@civicsync.test",
    "probe.security@civicsync.test",
    "probe.admin@civicsync.test",
];

const rows = [];

const call = async (label, path, token) => {
    try {
        const response = await fetch(BASE + path, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        let text = "";
        try {
            text = (await response.text()).slice(0, 200);
        } catch (error) {
            text = "<no body>";
        }
        rows.push({
            label,
            status: response.status,
            body: text.replace(/\s+/g, " "),
        });
    } catch (error) {
        rows.push({ label, status: "ERR", body: error.message });
    }
};

const login = async (email) => {
    const response = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: PASSWORD }),
    });
    const body = await response.json().catch(() => null);
    return body?.data?.token || null;
};

const setup = async () => {
    await mongoose.connect(process.env.DB_URI, {
        serverSelectionTimeoutMS: 10000,
    });

    await User.deleteMany({ email: { $in: tempEmails } });

    const base = {
        phone: "01100000000",
        password: PASSWORD,
        status: "ACTIVE",
    };

    const technician = await User.create({
        ...base,
        name: "Probe Technician",
        email: tempEmails[0],
        role: "TECHNICIAN",
        specializations: ["PLUMBING"],
    });

    await User.create({
        ...base,
        name: "Probe Resident",
        email: tempEmails[1],
        role: "RESIDENT",
    });

    await User.create({
        ...base,
        name: "Probe Security",
        email: tempEmails[2],
        role: "SECURITY",
    });

    await User.create({
        ...base,
        name: "Probe Admin",
        email: tempEmails[3],
        role: "ADMIN",
    });

    const ticket = await MaintenanceTicket.create({
        residentId: technician._id,
        title: "Probe OPEN plumbing ticket",
        category: "PLUMBING",
        description: "Temporary probe ticket for backend health check.",
        priority: "MEDIUM",
        status: "OPEN",
    });

    return { technician, ticket };
};

(async () => {
    let technician;
    let ticket;

    try {
        const setupResult = await setup();
        technician = setupResult.technician;
        ticket = setupResult.ticket;

        const techToken = await login(tempEmails[0]);
        const residentToken = await login(tempEmails[1]);
        const securityToken = await login(tempEmails[2]);
        const adminToken = await login(tempEmails[3]);

        rows.push({
            label: "logins (tech/res/security/admin)",
            status:
                techToken && residentToken && securityToken && adminToken
                    ? "OK"
                    : "MISSING",
            body: "",
        });

        await call("technician: available-tickets", "/technician/available-tickets", techToken);
        await call("technician: available-tickets/:id (NEW)", `/technician/available-tickets/${ticket._id}`, techToken);
        await call("technician: tickets/:id (assigned only)", `/technician/tickets/${ticket._id}`, techToken);
        await call("technician: assigned-tickets", "/technician/assigned-tickets", techToken);
        await call("technician: offers/my", "/technician/offers/my", techToken);
        await call("technician: reviews", "/technician/reviews", techToken);

        await call("resident: tickets", "/resident/tickets", residentToken);
        await call("resident: tickets/:id", `/resident/tickets/${ticket._id}`, residentToken);
        await call("resident: tickets/:id/offers", `/resident/tickets/${ticket._id}/offers`, residentToken);
        await call("resident: visits", "/visits", residentToken);

        await call("security: visits", "/visits/security/visits", securityToken);

        await call("admin: dashboard", "/admin/dashboard", adminToken);
        await call("admin: users", "/admin/users", adminToken);
        await call("admin: buildings", "/admin/buildings", adminToken);
        await call("admin: units", "/admin/units", adminToken);
        await call("admin: invoices", "/admin/invoices", adminToken);
        await call("admin: maintenance", "/admin/maintenance", adminToken);
        await call("admin: visits", "/admin/visits", adminToken);
        await call("admin: reports", "/admin/reports", adminToken);

        await call("shared: notifications", "/notifications", techToken);
        await call("shared: chat conversations", "/chat/conversations", techToken);
        await call("shared: auth/me", "/auth/me", techToken);
        await call("public: units/available", "/units/available");
        await call("public: visits/visitor-units", "/visits/visitor-units");
    } catch (error) {
        rows.push({ label: "PROBE ERROR", status: "ERR", body: error.message });
    } finally {
        try {
            if (technician) {
                await Offer.deleteMany({ technicianId: technician._id });
            }
            if (ticket) {
                await MaintenanceTicket.deleteMany({ _id: ticket._id });
            }
            await User.deleteMany({ email: { $in: tempEmails } });
        } catch (error) {
            console.log("cleanup error:", error.message);
        }
        await mongoose.disconnect();
    }

    console.log("\n===== BACKEND PROBE (live server on :3000) =====");
    for (const row of rows) {
        console.log(
            `${String(row.status).padEnd(5)} | ${row.label.padEnd(42)} | ${row.body}`
        );
    }

    const bad = rows.filter(
        (row) =>
            row.status === "ERR" ||
            (typeof row.status === "number" && row.status >= 500)
    );
    console.log(`\n5xx / transport errors: ${bad.length}`);
    process.exit(0);
})();

