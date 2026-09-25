/**
 * Central status vocabulary.
 *
 * These values are the ONLY statuses the API ever returns or accepts. They
 * mirror the Mongoose `enum` declarations 1:1 so the frontend can rely on a
 * single, stable contract (see frontend `src/app/core/models/status.ts`).
 */

const USER_ROLE = Object.freeze({
    RESIDENT: "RESIDENT",
    TECHNICIAN: "TECHNICIAN",
    SECURITY: "SECURITY",
    ADMIN: "ADMIN",
});

const USER_STATUS = Object.freeze({
    PENDING: "PENDING",
    ACTIVE: "ACTIVE",
    REJECTED: "REJECTED",
});

const TICKET_STATUS = Object.freeze({
    OPEN: "OPEN",
    ASSIGNED: "ASSIGNED",
    IN_PROGRESS: "IN_PROGRESS",
    RESOLVED: "RESOLVED",
    CLOSED: "CLOSED",
});

const TICKET_PRIORITY = Object.freeze({
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    URGENT: "URGENT",
});

const TICKET_CATEGORY = Object.freeze({
    PLUMBING: "PLUMBING",
    ELECTRICITY: "ELECTRICITY",
    ELEVATOR: "ELEVATOR",
    AC: "AC",
    GENERAL: "GENERAL",
});

const OFFER_STATUS = Object.freeze({
    PENDING: "PENDING",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    WITHDRAWN: "WITHDRAWN",
});

const VISIT_STATUS = Object.freeze({
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    QR_GENERATED: "QR_GENERATED",
    QR_SCANNED: "QR_SCANNED",
    CHECKED_IN: "CHECKED_IN",
    CHECKED_OUT: "CHECKED_OUT",
    EXPIRED: "EXPIRED",
});

const INVOICE_STATUS = Object.freeze({
    PENDING: "PENDING",
    PAYMENT_SUBMITTED: "PAYMENT_SUBMITTED",
    PAID: "PAID",
    OVERDUE: "OVERDUE",
    CANCELLED: "CANCELLED",
});

/**
 * Invoice statuses that are settled or voided — nothing is still owed on them.
 * Used by the resident dashboard so "outstanding" cannot drift from the
 * Pay / approve flow.
 */
const INVOICE_SETTLED_STATUSES = Object.freeze([
    INVOICE_STATUS.PAID,
    INVOICE_STATUS.CANCELLED,
]);

/**
 * Invoice statuses a resident still owes money on. PAYMENT_SUBMITTED is still
 * owed until an admin confirms the transfer, so it stays in this list.
 */
const INVOICE_UNPAID_STATUSES = Object.freeze([
    INVOICE_STATUS.PENDING,
    INVOICE_STATUS.OVERDUE,
    INVOICE_STATUS.PAYMENT_SUBMITTED,
]);

/**
 * Allowed maintenance-ticket transitions.
 * OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED
 *
 * Deliberately strict: no state may be skipped, and CLOSED is terminal.
 * (ASSIGNED -> OPEN is the documented roll-back used when an offer claim has
 * to be released after losing a concurrency race.)
 */
const TICKET_TRANSITIONS = Object.freeze({
    [TICKET_STATUS.OPEN]: [TICKET_STATUS.ASSIGNED],
    [TICKET_STATUS.ASSIGNED]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.OPEN],
    [TICKET_STATUS.IN_PROGRESS]: [TICKET_STATUS.RESOLVED],
    [TICKET_STATUS.RESOLVED]: [TICKET_STATUS.CLOSED],
    [TICKET_STATUS.CLOSED]: [],
});

/** Visits that may still be opened, scanned, or chatted with. */
const VISIT_CHAT_ALLOWED_STATUSES = Object.freeze([
    VISIT_STATUS.APPROVED,
    VISIT_STATUS.QR_GENERATED,
    VISIT_STATUS.QR_SCANNED,
    VISIT_STATUS.CHECKED_IN,
]);

/** Visits for which a QR pass may be minted or scanned. */
const VISIT_QR_ALLOWED_STATUSES = Object.freeze([
    VISIT_STATUS.APPROVED,
    VISIT_STATUS.QR_GENERATED,
]);

/**
 * Ticket states in which the resident <-> technician maintenance chat is
 * closed. Once a ticket is finished there is nothing left to negotiate, and
 * leaving the thread open lets either side keep messaging about a closed job.
 *
 * NOTE: `RESOLVED` is deliberately included even though the ticket is not yet
 * CLOSED — the work is handed over at RESOLVED, and any remaining discussion
 * belongs in the closing review, not in the work thread.
 */
const TICKET_CHAT_LOCKED_STATUSES = Object.freeze([
    TICKET_STATUS.RESOLVED,
    TICKET_STATUS.CLOSED,
]);

/** True when a ticket in this state must have its chat disabled. */
const isTicketChatLocked = (status) =>
    TICKET_CHAT_LOCKED_STATUSES.includes(status);

const canTransitionTicket = (from, to) =>
    Boolean(TICKET_TRANSITIONS[from]) &&
    TICKET_TRANSITIONS[from].includes(to);

/**
 * Throw a 400 unless `from -> to` is an allowed maintenance transition.
 * Used so every controller/service enforces the same state machine instead
 * of each one inventing its own `if (status !== ...)` guard.
 */
const assertTicketTransition = (from, to) => {
    if (!canTransitionTicket(from, to)) {
        const error = new Error(
            `Invalid ticket status transition: ${from} -> ${to}`
        );
        error.statusCode = 400;
        throw error;
    }
};

const isVisitChatAllowed = (status) =>
    VISIT_CHAT_ALLOWED_STATUSES.includes(status);

module.exports = {
    USER_ROLE,
    USER_STATUS,
    TICKET_STATUS,
    TICKET_PRIORITY,
    TICKET_CATEGORY,
    OFFER_STATUS,
    VISIT_STATUS,
    INVOICE_STATUS,
    INVOICE_SETTLED_STATUSES,
    INVOICE_UNPAID_STATUSES,
    TICKET_TRANSITIONS,
    VISIT_CHAT_ALLOWED_STATUSES,
    VISIT_QR_ALLOWED_STATUSES,
    TICKET_CHAT_LOCKED_STATUSES,
    canTransitionTicket,
    assertTicketTransition,
    isVisitChatAllowed,
    isTicketChatLocked,
};
