/**
 * STRICT STATUS MATCHING guard.
 *
 * The Mongoose enums are the API contract. If a model enum and the shared
 * status vocabulary in utils/statusConstants.js ever drift apart, this suite
 * fails — which is exactly what keeps the frontend from inventing statuses.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const User = require("../models/user");
const MaintenanceTicket = require("../models/maintenanceTicket");
const Offer = require("../models/offer");
const Visit = require("../models/visit");
const Invoice = require("../models/invoice");

const {
    USER_ROLE,
    USER_STATUS,
    TICKET_STATUS,
    TICKET_PRIORITY,
    TICKET_CATEGORY,
    OFFER_STATUS,
    VISIT_STATUS,
    INVOICE_STATUS,
} = require("../utils/statusConstants");

const sortValues = (values) => [...values].sort();

const enumValuesOf = (Model, path) => {
    const schemaPath = Model.schema.path(path);

    assert.ok(schemaPath, `${Model.modelName}.${path} must exist`);
    assert.ok(
        Array.isArray(schemaPath.enumValues),
        `${Model.modelName}.${path} must be an enum`
    );

    return schemaPath.enumValues;
};

test("User.role enum matches USER_ROLE", () => {
    assert.deepEqual(
        sortValues(enumValuesOf(User, "role")),
        sortValues(Object.values(USER_ROLE))
    );
});

test("User.status enum matches USER_STATUS", () => {
    assert.deepEqual(
        sortValues(enumValuesOf(User, "status")),
        sortValues(Object.values(USER_STATUS))
    );
});

test("MaintenanceTicket.status enum matches TICKET_STATUS", () => {
    assert.deepEqual(
        sortValues(enumValuesOf(MaintenanceTicket, "status")),
        sortValues(Object.values(TICKET_STATUS))
    );
});

test("MaintenanceTicket.priority enum matches TICKET_PRIORITY", () => {
    assert.deepEqual(
        sortValues(enumValuesOf(MaintenanceTicket, "priority")),
        sortValues(Object.values(TICKET_PRIORITY))
    );
});

test("MaintenanceTicket.category enum matches TICKET_CATEGORY", () => {
    assert.deepEqual(
        sortValues(enumValuesOf(MaintenanceTicket, "category")),
        sortValues(Object.values(TICKET_CATEGORY))
    );
});

test("Offer.status enum matches OFFER_STATUS", () => {
    assert.deepEqual(
        sortValues(enumValuesOf(Offer, "status")),
        sortValues(Object.values(OFFER_STATUS))
    );
});

test("Visit.status enum matches VISIT_STATUS", () => {
    assert.deepEqual(
        sortValues(enumValuesOf(Visit, "status")),
        sortValues(Object.values(VISIT_STATUS))
    );
});

test("Invoice.status enum matches INVOICE_STATUS", () => {
    assert.deepEqual(
        sortValues(enumValuesOf(Invoice, "status")),
        sortValues(Object.values(INVOICE_STATUS))
    );
});

test("new tickets default to OPEN", () => {
    const ticket = new MaintenanceTicket({
        residentId: "000000000000000000000001",
        title: "Leaking tap",
        category: "PLUMBING",
        description: "The kitchen tap keeps dripping.",
    });

    assert.equal(ticket.status, TICKET_STATUS.OPEN);
    assert.equal(ticket.priority, TICKET_PRIORITY.MEDIUM);
});

test("new offers default to PENDING", () => {
    const offer = new Offer({
        ticketId: "000000000000000000000001",
        technicianId: "000000000000000000000002",
        price: 100,
        estimatedDuration: 60,
    });

    assert.equal(offer.status, OFFER_STATUS.PENDING);
});

test("new visits default to PENDING", () => {
    const visit = new Visit({
        buildingId: "000000000000000000000001",
        unitId: "000000000000000000000002",
        visitorName: "Sara",
        visitorEmail: "SARA@Example.COM",
        source: "VISITOR_REQUEST",
        visitDate: new Date(),
        visitStartTime: "10:00",
    });

    assert.equal(visit.status, VISIT_STATUS.PENDING);
    // The schema lower-cases visitor e-mails, matching auth normalisation.
    assert.equal(visit.visitorEmail, "sara@example.com");
});

test("invalid statuses are rejected by the models", () => {
    const ticket = new MaintenanceTicket({
        residentId: "000000000000000000000001",
        title: "Leaking tap",
        category: "PLUMBING",
        description: "The kitchen tap keeps dripping.",
        status: "DONE",
    });

    const error = ticket.validateSync();

    assert.ok(error, "an invalid status must fail validation");
    assert.ok(error.errors["status"], "the status path must be invalid");
});

test("the visitor conversation index is defined exactly once and is named", () => {
    const Conversation = require("../models/conversation");

    const visitIndexes = Conversation.schema
        .indexes()
        .filter(([fields]) => Object.keys(fields).includes("relatedVisitId"));

    assert.equal(
        visitIndexes.length,
        1,
        "only one index may target relatedVisitId (guards the duplicate-index warning)"
    );

    const [, options] = visitIndexes[0];

    assert.equal(options.name, "visitor_conversation_visit_unique");
    assert.equal(options.unique, true);
    assert.equal(options.partialFilterExpression.type, "VISITOR");
});
