// Focused check for the Resident dashboard "Paid" card and the maintenance
// invoice surfacing. Runs against the live database using the real service,
// then removes exactly what it created.
//
// Run from the project root:  node backend/tests/manual/verify-paid-card.js
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../../models/user");
const Unit = require("../../models/unit");
const Building = require("../../models/building");
const MaintenanceTicket = require("../../models/maintenanceTicket");
const Invoice = require("../../models/invoice");
const residentDashboardService = require("../../services/residentDashboardService");

const EMAIL = "verify.paid@civicsync.test";

const money = (value) => `${Number(value).toLocaleString("en-US")} EGP`;

const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(
        `${ok ? "PASS" : "FAIL"} | ${label.padEnd(46)} | got ${String(
            actual
        ).padStart(8)} | expected ${String(expected).padStart(8)}`
    );
    return ok;
};

(async () => {
    await mongoose.connect(process.env.DB_URI, {
        serverSelectionTimeoutMS: 10000,
    });

    // ---- clean any previous run -------------------------------------------
    await User.deleteMany({ email: EMAIL });

    const building = await Building.create({
        name: "Verify Tower",
        buildingNumber: 99,
        floorsCount: 3,
        description: "temporary verification building",
    });

    const unit = await Unit.create({
        buildingId: building._id,
        unitNumber: 9901,
        floor: 1,
        type: "APARTMENT",
        status: "OCCUPIED",
    });

    const resident = await User.create({
        name: "Verify Resident",
        email: EMAIL,
        phone: "01000000099",
        password: "Password123",
        role: "RESIDENT",
        status: "ACTIVE",
        unitId: unit._id,
    });

    const ticket = await MaintenanceTicket.create({
        residentId: resident._id,
        title: "Verify plumbing job",
        category: "PLUMBING",
        description: "temporary ticket",
        priority: "MEDIUM",
        status: "CLOSED",
    });

    const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 1) A PAID regular (ticket-less) invoice  -> counts toward Paid
    const paidRegular = await Invoice.create({
        residentId: resident._id,
        ticketId: null,
        unitId: unit._id,
        description: "Quarterly service charge",
        amount: 2500,
        dueDate: due,
        status: "PAID",
        paidAt: new Date(),
    });

    // 2) A PAID maintenance invoice -> also counts toward Paid
    const paidMaintenance = await Invoice.create({
        residentId: resident._id,
        ticketId: ticket._id,
        unitId: unit._id,
        description: "Maintenance plumbing repair",
        amount: 3500,
        dueDate: due,
        status: "PAID",
        paidAt: new Date(),
    });

    // 3) Statuses that must NOT count toward Paid
    const pending = await Invoice.create({
        residentId: resident._id,
        unitId: unit._id,
        description: "Pending invoice",
        amount: 1000,
        dueDate: due,
        status: "PENDING",
    });

    const overdue = await Invoice.create({
        residentId: resident._id,
        unitId: unit._id,
        description: "Overdue invoice",
        amount: 700,
        dueDate: due,
        status: "OVERDUE",
    });

    const submitted = await Invoice.create({
        residentId: resident._id,
        unitId: unit._id,
        description: "Claimed by resident, not confirmed",
        amount: 400,
        dueDate: due,
        status: "PAYMENT_SUBMITTED",
        paymentSubmittedAt: new Date(),
    });

    const cancelled = await Invoice.create({
        residentId: resident._id,
        unitId: unit._id,
        description: "Cancelled invoice",
        amount: 9999,
        dueDate: due,
        status: "CANCELLED",
    });

    let failures = 0;

    try {
        const dashboard = await residentDashboardService.getResidentDashboard(
            resident._id
        );

        const billing = dashboard.billing;

        console.log("\n===== RESIDENT DASHBOARD BILLING =====");
        console.log(`paidBalance      : ${money(billing.paidBalance)}`);
        console.log(`paidInvoicesTotal: ${money(billing.paidInvoicesTotal)}`);
        console.log(`paidMaintenance  : ${money(billing.paidMaintenance)}`);
        console.log(`invoicesDue      : ${money(billing.invoicesDue)}`);
        console.log(`outstanding      : ${money(billing.outstandingBalance)}`);
        console.log(
            `invoice rows     : ${billing.invoices.length} (of 6 created)`
        );
        console.log("");

        // ---- Issue 4: Paid = PAID invoices only --------------------------
        const expectedPaid = 2500 + 3500; // paid regular + paid maintenance
        if (!check("Paid = PAID regular + PAID maintenance", billing.paidBalance, expectedPaid)) {
            failures += 1;
        }

        // ---- Paid split: regular bills vs maintenance jobs ---------------
        if (!check("paidInvoicesTotal = PAID regular only", billing.paidInvoicesTotal, 2500)) {
            failures += 1;
        }
        if (!check("paidMaintenance = PAID maintenance only", billing.paidMaintenance, 3500)) {
            failures += 1;
        }
        if (!check(
            "split adds back up to paidBalance",
            billing.paidMaintenance + billing.paidInvoicesTotal,
            billing.paidBalance
        )) {
            failures += 1;
        }
        // Unpaid invoices must not leak into either half of the split.
        if (!check("split ignores unpaid invoices", billing.paidInvoicesTotal + billing.paidMaintenance !== 6500 + 1000 + 700 + 400, true)) {
            failures += 1;
        }

        // Explicitly prove the excluded statuses are excluded.
        if (!check("Paid excludes PENDING (1000)", billing.paidBalance !== 3500 + 1000, true)) {
            failures += 1;
        }
        if (!check("Paid excludes OVERDUE (700)", billing.paidBalance !== 6700 + 700, true)) {
            failures += 1;
        }
        if (!check("Paid excludes CANCELLED (9999)", billing.paidBalance !== 16699, true)) {
            failures += 1;
        }

        // ---- Outstanding = PENDING + OVERDUE + PAYMENT_SUBMITTED ---------
        // (maintenanceDue is 0 here: the ticket has no accepted offer.)
        const expectedDue = 1000 + 700 + 400;
        if (!check("invoicesDue = PENDING+OVERDUE+SUBMITTED", billing.invoicesDue, expectedDue)) {
            failures += 1;
        }

        if (!check("outstanding = invoicesDue + maintenanceDue", billing.outstandingBalance, expectedDue + billing.maintenanceDue)) {
            failures += 1;
        }

        // ---- Issue 5: maintenance invoice present in the list ------------
        const rows = billing.invoices;
        const maintenanceRow = rows.find(
            (row) => String(row.ticketId) === String(ticket._id)
        );

        if (!check("maintenance invoice appears in list", Boolean(maintenanceRow), true)) {
            failures += 1;
        }
        if (!check("maintenance invoice carries its title", maintenanceRow?.ticketTitle === "Verify plumbing job", true)) {
            failures += 1;
        }
        if (!check("maintenance invoice carries its category", maintenanceRow?.ticketCategory === "PLUMBING", true)) {
            failures += 1;
        }
        if (!check("paid maintenance flagged PAID", maintenanceRow?.status === "PAID", true)) {
            failures += 1;
        }
        if (!check("invoice row carries description", maintenanceRow?.description === "Maintenance plumbing repair", true)) {
            failures += 1;
        }
        if (!check("invoice row carries unitId (for receipt)", maintenanceRow?.unitId != null, true)) {
            failures += 1;
        }

        console.log(
            `\nPASS/FAIL summary: ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`
        );
    } catch (error) {
        console.error("VERIFICATION ERROR:", error.message);
        failures += 1;
    } finally {
        // ---- remove exactly what this script created ----------------------
        await Invoice.deleteMany({
            _id: {
                $in: [
                    paidRegular._id,
                    paidMaintenance._id,
                    pending._id,
                    overdue._id,
                    submitted._id,
                    cancelled._id,
                ],
            },
        });
        await MaintenanceTicket.deleteMany({ _id: ticket._id });
        await User.deleteMany({ _id: resident._id });
        await Unit.deleteMany({ _id: unit._id });
        await Building.deleteMany({ _id: building._id });
        await mongoose.disconnect();
    }

    process.exit(failures === 0 ? 0 : 1);
})();