/**
 * Guards for the backend changes that support the admin / upload / chat-lock
 * features. These are pure-surface assertions (route registration, filter
 * normalisation, state-machine helpers) so they need no database.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const uploadRoutes = require("../routes/uploadRoutes");
const adminRoutes = require("../routes/adminRoutes");

const {
    isTicketChatLocked,
    TICKET_CHAT_LOCKED_STATUSES,
    TICKET_STATUS,
} = require("../utils/statusConstants");

/** Recursively collect `METHOD path` pairs from an Express router. */
const collectRoutes = (router) => {
    const routes = [];

    const walk = (stack) => {
        for (const layer of stack || []) {
            if (layer.route) {
                const methods = Object.keys(layer.route.methods || {})
                    .filter((method) => layer.route.methods[method])
                    .map((method) => method.toUpperCase());

                for (const method of methods) {
                    routes.push(`${method} ${layer.route.path}`);
                }
                continue;
            }

            if (layer.handle && layer.handle.stack) {
                walk(layer.handle.stack);
            }
        }
    };

    walk(router.stack);

    return routes;
};

test("upload routes expose profile image and ticket attachment endpoints", () => {
    const routes = collectRoutes(uploadRoutes);

    assert.ok(
        routes.includes("POST /profile-image"),
        "missing POST /profile-image"
    );
    assert.ok(
        routes.includes("POST /ticket-attachment"),
        "missing POST /ticket-attachment"
    );
});

test("admin routes expose the full compound report download", () => {
    const routes = collectRoutes(adminRoutes);

    assert.ok(routes.includes("GET /reports"), "missing GET /reports");
    assert.ok(
        routes.includes("GET /reports/full"),
        "missing GET /reports/full"
    );
});

test("maintenance chat locks once the ticket reaches a final state", () => {
    // A job in flight keeps the conversation open...
    assert.equal(isTicketChatLocked(TICKET_STATUS.OPEN), false);
    assert.equal(isTicketChatLocked(TICKET_STATUS.ASSIGNED), false);
    assert.equal(isTicketChatLocked(TICKET_STATUS.IN_PROGRESS), false);

    // ...but RESOLVED (handed over) and CLOSED (done) both lock it.
    assert.equal(isTicketChatLocked(TICKET_STATUS.RESOLVED), true);
    assert.equal(isTicketChatLocked(TICKET_STATUS.CLOSED), true);
});

test("the locked status list is derived from the shared ticket vocabulary", () => {
    for (const status of TICKET_CHAT_LOCKED_STATUSES) {
        assert.ok(
            Object.values(TICKET_STATUS).includes(status),
            `${status} must be a real TICKET_STATUS`
        );
    }
});

test("admin filter normalisation treats ALL / blank as no-filter", async () => {
    const { normalizeFilter } = require("../services/adminService");

    for (const value of [
        "",
        "   ",
        "ALL",
        "all",
        "All",
        undefined,
        null,
        "undefined",
        "null",
    ]) {
        assert.equal(
            normalizeFilter(value),
            null,
            `${JSON.stringify(value)} must mean "everything"`
        );
    }

    assert.equal(normalizeFilter("OPEN"), "OPEN");
    assert.equal(normalizeFilter(" RESIDENT "), "RESIDENT");
});