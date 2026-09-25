/**
 * Verifies the documented state machine in utils/statusConstants.js.
 * These are the transitions the API promises, so they are contract tests.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TICKET_STATUS,
    TICKET_TRANSITIONS,
    VISIT_CHAT_ALLOWED_STATUSES,
    canTransitionTicket,
    assertTicketTransition,
    isVisitChatAllowed,
} = require("../utils/statusConstants");

test("ticket status vocabulary is exactly the documented one", () => {
    assert.deepEqual(Object.values(TICKET_STATUS), [
        "OPEN",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
    ]);
});

test("the happy path OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED is allowed", () => {
    const path = [
        TICKET_STATUS.OPEN,
        TICKET_STATUS.ASSIGNED,
        TICKET_STATUS.IN_PROGRESS,
        TICKET_STATUS.RESOLVED,
        TICKET_STATUS.CLOSED,
    ];

    for (let index = 0; index < path.length - 1; index += 1) {
        assert.equal(
            canTransitionTicket(path[index], path[index + 1]),
            true,
            `${path[index]} -> ${path[index + 1]} must be allowed`
        );
    }
});

test("skipping states is rejected", () => {
    const illegal = [
        [TICKET_STATUS.OPEN, TICKET_STATUS.RESOLVED],
        [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS],
        [TICKET_STATUS.ASSIGNED, TICKET_STATUS.RESOLVED],
        [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.CLOSED],
        [TICKET_STATUS.CLOSED, TICKET_STATUS.OPEN],
    ];

    for (const [from, to] of illegal) {
        assert.equal(
            canTransitionTicket(from, to),
            false,
            `${from} -> ${to} must be rejected`
        );
    }
});

test("assertTicketTransition throws a 400 on illegal transitions", () => {
    assert.throws(
        () => assertTicketTransition(TICKET_STATUS.OPEN, TICKET_STATUS.CLOSED),
        (error) => error.statusCode === 400
    );
});

test("assertTicketTransition is silent on legal transitions", () => {
    assert.doesNotThrow(() =>
        assertTicketTransition(TICKET_STATUS.OPEN, TICKET_STATUS.ASSIGNED)
    );
});

test("the CLOSED state is terminal", () => {
    assert.deepEqual(TICKET_TRANSITIONS[TICKET_STATUS.CLOSED], []);
});

test("visitor chat only stays open for APPROVED / QR_GENERATED / QR_SCANNED / CHECKED_IN", () => {
    assert.deepEqual(VISIT_CHAT_ALLOWED_STATUSES, [
        "APPROVED",
        "QR_GENERATED",
        "QR_SCANNED",
        "CHECKED_IN",
    ]);

    for (const closedStatus of ["CHECKED_OUT", "REJECTED", "EXPIRED"]) {
        assert.equal(
            isVisitChatAllowed(closedStatus),
            false,
            `${closedStatus} must close the visitor chat`
        );
    }
});
