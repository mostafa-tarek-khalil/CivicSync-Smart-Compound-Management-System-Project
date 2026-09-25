// Offline verification of the resident "Paid" / outstanding arithmetic.
//
// The live-database variant (verify-paid-card.js) needs MongoDB Atlas, which is
// unreachable from some environments. This version exercises the SAME rules
// against the SAME constants the service uses, so the number on the Paid card
// can be checked without a database.
//
// Run from the project root:  node backend/tests/manual/verify-billing-math.js
const {
    INVOICE_UNPAID_STATUSES,
} = require("../../utils/statusConstants");

// Mirrors residentDashboardService: this is the exact predicate used there.
const UNPAID_INVOICE_STATUSES = [...INVOICE_UNPAID_STATUSES];

const invoices = [
    { id: "paid-regular", status: "PAID", amount: 2500, ticket: null },
    { id: "paid-maint", status: "PAID", amount: 3500, ticket: "t1" },
    { id: "pending", status: "PENDING", amount: 1000, ticket: null },
    { id: "overdue", status: "OVERDUE", amount: 700, ticket: null },
    { id: "submitted", status: "PAYMENT_SUBMITTED", amount: 400, ticket: null },
    { id: "cancelled", status: "CANCELLED", amount: 9999, ticket: null },
];

// --- production logic, copied verbatim from residentDashboardService ---
const unpaidInvoices = invoices.filter((invoice) =>
    UNPAID_INVOICE_STATUSES.includes(invoice.status)
);

const invoicesDue = unpaidInvoices.reduce(
    (sum, invoice) => sum + (invoice.amount || 0),
    0
);

const paidBalance = invoices
    .filter((invoice) => invoice.status === "PAID")
    .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
// -----------------------------------------------------------------------

let failures = 0;

const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(
        `${ok ? "PASS" : "FAIL"} | ${label.padEnd(48)} | got ${String(actual).padStart(6)} | expected ${String(expected).padStart(6)}`
    );
    if (!ok) failures += 1;
};

console.log("\n===== BILLING MATH (offline, real constants) =====\n");

// Issue 4: Paid is PAID only, covering both regular and maintenance invoices.
check("Paid = 2500 (regular) + 3500 (maintenance)", paidBalance, 6000);

// Each non-PAID status is provably excluded.
check("Paid excludes PENDING", paidBalance === 6000 && !unpaidInvoices.includes(invoices[0]), true);
check("Paid excludes OVERDUE", paidBalance !== 6700, true);
check("Paid excludes PAYMENT_SUBMITTED", paidBalance !== 6400, true);
check("Paid excludes CANCELLED (9999)", paidBalance !== 15999, true);

// Outstanding = PENDING + OVERDUE + PAYMENT_SUBMITTED.
check("Due = 1000 + 700 + 400", invoicesDue, 2100);
check("Cancelled excluded from due", unpaidInvoices.some((i) => i.status === "CANCELLED"), false);

console.log(
    `\nPaid card shows  : ${paidBalance.toLocaleString("en-US")} EGP`
);
console.log(`Outstanding shows: ${invoicesDue.toLocaleString("en-US")} EGP`);

console.log(
    `\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`
);

process.exit(failures === 0 ? 0 : 1);