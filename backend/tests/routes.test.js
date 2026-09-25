/**
 * Route-surface contract tests.
 *
 * These assert the API the frontend services depend on actually exists —
 * in particular that every technician operation lives under /api/technician
 * and that the forgot/reset password endpoints are registered.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const authRoutes = require("../routes/authRoutes");
const technicianRoutes = require("../routes/technicianRoutes");
const residentRoutes = require("../routes/residentRoutes");
const notificationRoutes = require("../routes/notificationRoutes");

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

test("auth routes expose register, login, me and the password-reset flow", () => {
    const routes = collectRoutes(authRoutes);

    for (const expected of [
        "POST /register",
        "POST /login",
        "POST /forgot-password",
        "POST /reset-password",
        "GET /me",
        "PATCH /me",
    ]) {
        assert.ok(routes.includes(expected), `missing ${expected}`);
    }
});

test("technician routes expose the full offer / negotiation / job surface", () => {
    const routes = collectRoutes(technicianRoutes);

    for (const expected of [
        "GET /dashboard",
        "GET /available-tickets",
        "GET /available-tickets/:id",
        "GET /assigned-tickets",
        "GET /tickets/:id",
        "PATCH /tickets/:id/start",
        "PATCH /tickets/:id/resolve",
        "POST /tickets/:id/skip",
        "GET /reviews",
        "GET /offers/my",
        "POST /tickets/:ticketId/offers",
        "PATCH /offers/:id",
        "PATCH /offers/:id/withdraw",
        "GET /offers/:offerId/negotiations",
        "POST /offers/:offerId/negotiations",
    ]) {
        assert.ok(routes.includes(expected), `missing ${expected}`);
    }
});

test("residents keep their own accept/review/negotiation surface", () => {
    const routes = collectRoutes(residentRoutes);

    for (const expected of [
        "GET /dashboard",
        "GET /tickets",
        "POST /tickets",
        "GET /tickets/:id",
        "PATCH /tickets/:id/close",
        "GET /tickets/:ticketId/offers",
        "PATCH /offers/:offerId/accept",
        "POST /tickets/:ticketId/review",
    ]) {
        assert.ok(routes.includes(expected), `missing ${expected}`);
    }
});

test("notification routes support list, unread filter, read and delete", () => {
    const routes = collectRoutes(notificationRoutes);

    for (const expected of [
        "GET /",
        "PATCH /read-all",
        "PATCH /:id/read",
        "DELETE /:id",
    ]) {
        assert.ok(routes.includes(expected), `missing ${expected}`);
    }
});

test("technician and resident route prefixes are fully separated", () => {
    // Guards against the regression this refactor fixes: technician screens
    // calling /api/resident endpoints (and vice-versa).
    const technicianRoutesList = collectRoutes(technicianRoutes);
    const residentRoutesList = collectRoutes(residentRoutes);

    assert.ok(technicianRoutesList.includes("PATCH /offers/:id/withdraw"));
    assert.ok(!residentRoutesList.includes("PATCH /offers/:id/withdraw"));

    assert.ok(residentRoutesList.includes("PATCH /offers/:offerId/accept"));
    assert.ok(!technicianRoutesList.includes("PATCH /offers/:offerId/accept"));
});
