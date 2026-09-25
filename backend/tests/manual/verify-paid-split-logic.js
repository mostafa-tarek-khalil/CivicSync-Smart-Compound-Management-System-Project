// Offline check for the Resident dashboard "Paid" split.
//
// The live-database script (verify-paid-card.js) needs network access to Atlas,
// which is not always available. This one needs no database: it pulls the exact
// split logic out of the service source and runs it against the same invoice
// shapes, so a regression in the arithmetic is caught either way.
//
// Run from the project root:  node backend/tests/manual/verify-paid-split-logic.js
const fs = require("fs");
const path = require("path");

const SERVICE = path.join(__dirname, "..", "..", "services", "residentDashboardService.js");
const source = fs.readFileSync(SERVICE, "utf8");

// Pull the three reducer blocks straight out of the service, so this test fails
// if someone edits the service rather than silently testing a stale copy.
const extract = (startMarker, endMarker) => {
    const from = source.indexOf(startMarker);
    if (from === -1) throw new Error(`marker not found: ${startMarker}`);
    const to = source.indexOf(endMarker, from);
    if (to === -1) throw new Error(`end marker not found: ${endMarker}`);
    return source.slice(from, to);
};

const block = extract(
    "const paidInvoices = invoices.filter",
    "const latestInvoice ="
);

// Rebuild the block as a function we can call with any invoice list.
const computeSplit = new Function("invoices", `${block}
    return { paidBalance, paidMaintenance, paidInvoicesTotal };`);

// The closed-ticket aggregation lives in its own block, so pull that out too
// and drive it with ticket lists.
const closedBlock = extract(
    "const closedUninvoicedTickets = uninvoicedMaintenance.filter",
    "// ---------------- Billing ----------------"
);

const computeClosed = new Function(
    "uninvoicedMaintenance",
    "priceByTicket",
    `${closedBlock}
    return { closedMaintenanceValue, closedMaintenanceCount: closedUninvoicedTickets.length };`
);

const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(
        `${ok ? "PASS" : "FAIL"} | ${label.padEnd(52)} | got ${String(actual).padStart(7)} | expected ${String(expected).padStart(7)}`
    );
    return ok;
};

// A populated ticketId is an object, an absent one is null — matching what
// `Invoice.find().populate("ticketId", ...)` yields in the service.
const TICKET = { _id: "t1", title: "AC repair", category: "HVAC" };

const invoices = [
    { amount: 2500, status: "PAID", ticketId: null }, // regular bill
    { amount: 3500, status: "PAID", ticketId: TICKET }, // maintenance job
    { amount: 1200, status: "PAID", ticketId: null }, // another regular bill
    { amount: 800, status: "PAID", ticketId: TICKET }, // another maintenance job
    { amount: 1000, status: "PENDING", ticketId: null }, // must be ignored
    { amount: 700, status: "OVERDUE", ticketId: null }, // must be ignored
    { amount: 400, status: "PAYMENT_SUBMITTED", ticketId: TICKET }, // ignored
    { amount: 5000, status: "CANCELLED", ticketId: TICKET }, // ignored
];

let failures = 0;
const result = computeSplit(invoices);

console.log("\n===== PAID SPLIT (offline) =====");
console.log(`paidBalance       : ${result.paidBalance}`);
console.log(`paidInvoicesTotal : ${result.paidInvoicesTotal}`);
console.log(`paidMaintenance   : ${result.paidMaintenance}\n`);

if (!check("paidBalance = all PAID invoices", result.paidBalance, 2500 + 3500 + 1200 + 800)) failures++;
if (!check("paidInvoicesTotal = PAID bills only", result.paidInvoicesTotal, 2500 + 1200)) failures++;
if (!check("paidMaintenance = PAID maintenance only", result.paidMaintenance, 3500 + 800)) failures++;
if (!check("split adds back to the total", result.paidMaintenance + result.paidInvoicesTotal, result.paidBalance)) failures++;
if (!check("unpaid invoices excluded from split", result.paidInvoicesTotal !== 2500 + 1200 + 1000 + 700, true)) failures++;
if (!check("cancelled invoices excluded", result.paidInvoicesTotal + result.paidMaintenance !== 5000, true)) failures++;

// Nothing paid at all is the state every new resident starts in.
const empty = computeSplit([]);
if (!check("empty history -> all zeros", empty.paidBalance + empty.paidInvoicesTotal + empty.paidMaintenance, 0)) failures++;

// Only maintenance paid: the invoices half must be a real 0, not undefined.
const onlyMaint = computeSplit([{ amount: 900, status: "PAID", ticketId: TICKET }]);
if (!check("maintenance-only -> invoices half is 0", onlyMaint.paidInvoicesTotal, 0)) failures++;
if (!check("maintenance-only -> maintenance half", onlyMaint.paidMaintenance, 900)) failures++;

// Only regular bills paid: the maintenance half must be a real 0.
const onlyBills = computeSplit([{ amount: 300, status: "PAID", ticketId: null }]);
if (!check("bills-only -> maintenance half is 0", onlyBills.paidMaintenance, 0)) failures++;
if (!check("bills-only -> invoices half", onlyBills.paidInvoicesTotal, 300)) failures++;

// ---------------- Closed tickets surface without an invoice ----------------
// This is the behaviour under test: the agreed price of a CLOSED job must be
// visible as soon as the ticket closes, not only after it is invoiced and paid.
console.log("\n===== CLOSED JOBS AWAITING INVOICE =====");

const priceByTicket = new Map([
    ["closed-1", 3500],
    ["closed-2", 1200],
    ["open-1", 800],
    ["progress-1", 400]
]);

const uninvoicedMaintenance = [
    { _id: "closed-1", status: "CLOSED" }, // finished -> should surface
    { _id: "closed-2", status: "CLOSED" }, // finished -> should surface
    { _id: "open-1", status: "OPEN" }, // not finished -> must NOT surface
    { _id: "progress-1", status: "IN_PROGRESS" } // must NOT surface
];

const closed = computeClosed(uninvoicedMaintenance, priceByTicket);
console.log(`closedMaintenanceValue : ${closed.closedMaintenanceValue}`);
console.log(`closedMaintenanceCount : ${closed.closedMaintenanceCount}\n`);

if (!check("closed value = closed jobs only", closed.closedMaintenanceValue, 3500 + 1200)) failures++;
if (!check("closed count = closed jobs only", closed.closedMaintenanceCount, 2)) failures++;
if (!check("open job excluded from closed value", closed.closedMaintenanceValue !== 3500 + 1200 + 800, true)) failures++;
if (!check("in-progress job excluded", closed.closedMaintenanceValue !== 400, true)) failures++;

// A closed job with no accepted offer has no agreed price, so it must add
// nothing — otherwise the card would show 0 EGP jobs as owed.
const noPrice = computeClosed([{ _id: "unpriced-1", status: "CLOSED" }], priceByTicket);
if (!check("closed job without a price adds 0", noPrice.closedMaintenanceValue, 0)) failures++;
if (!check("closed job without a price still counted", noPrice.closedMaintenanceCount, 1)) failures++;

// No closed jobs -> a real 0, so the hint stays hidden on the dashboard.
const noneClosed = computeClosed([{ _id: "open-1", status: "OPEN" }], priceByTicket);
if (!check("no closed jobs -> 0", noneClosed.closedMaintenanceValue, 0)) failures++;
if (!check("no closed jobs -> count 0", noneClosed.closedMaintenanceCount, 0)) failures++;

console.log(
    `\nPASS/FAIL summary: ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`
);
process.exit(failures === 0 ? 0 : 1);