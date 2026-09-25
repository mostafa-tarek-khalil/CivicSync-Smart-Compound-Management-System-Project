const mongoose = require("mongoose");
const MaintenanceTicket = require("../models/maintenanceTicket");
const Offer = require("../models/offer");
const Invoice = require("../models/invoice");
const Visit = require("../models/visit");
const visitService = require("./visitService");
const {
    INVOICE_UNPAID_STATUSES,
} = require("../utils/statusConstants");

// Outstanding = anything still owed: unpaid invoices (including a payment the
// resident has claimed but the admin has not confirmed) plus agreed but
// un-invoiced maintenance cost.
const UNPAID_INVOICE_STATUSES = [...INVOICE_UNPAID_STATUSES];

/**
 * Aggregates everything the resident dashboard needs in one call so the
 * maintenance, billing and visitor modules stay in sync on a single screen.
 *
 * Outstanding balance =
 *   unpaid invoices (PENDING / OVERDUE)
 * + agreed maintenance cost (accepted offers) for tickets that were not
 *   invoiced yet — so the resident sees what they owe for repairs as soon
 *   as they accept a technician offer, without double counting once the
 *   admin issues the invoice.
 */
const getResidentDashboard = async (residentId) => {
    const residentObjectId = new mongoose.Types.ObjectId(String(residentId));

    // Keep visit statuses fresh (expired OTP / QR windows) before counting.
    try {
        await visitService.expireStaleVisits();
    } catch (error) {
        console.error("Dashboard visit expiry error:", error.message);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [tickets, invoices, visitsThisMonth, pendingVisitorRequests, recentVisits] =
        await Promise.all([
            MaintenanceTicket.find({ residentId: residentObjectId })
                .populate("assignedTo", "name email phone role rating totalReviews")
                .sort({ createdAt: -1 })
                .lean(),
            Invoice.find({ residentId: residentObjectId })
                .populate("ticketId", "title category status")
                .populate("unitId", "unitNumber floor type buildingId")
                .sort({ createdAt: -1 })
                .lean(),
            Visit.countDocuments({
                residentId: residentObjectId,
                visitDate: { $gte: monthStart, $lt: nextMonthStart },
            }),
            Visit.countDocuments({
                residentId: residentObjectId,
                source: "VISITOR_REQUEST",
                status: "PENDING",
            }),
            Visit.find({ residentId: residentObjectId })
                .select("visitorName visitDate visitStartTime status source purpose createdAt")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
        ]);

    // ---------------- Maintenance ----------------
    const countByStatus = (status) =>
        tickets.filter((ticket) => ticket.status === status).length;

    const ticketStats = {
        total: tickets.length,
        open: countByStatus("OPEN"),
        assigned: countByStatus("ASSIGNED"),
        inProgress: countByStatus("IN_PROGRESS"),
        resolved: countByStatus("RESOLVED"),
        closed: countByStatus("CLOSED"),
    };
    ticketStats.completed = ticketStats.resolved + ticketStats.closed;

    // Accepted offers = the agreed price of each maintenance job.
    const ticketIds = tickets.map((ticket) => ticket._id);
    const acceptedOffers = ticketIds.length
        ? await Offer.find({
            ticketId: { $in: ticketIds },
            status: "ACCEPTED",
        })
            .select("ticketId price")
            .lean()
        : [];

    const priceByTicket = new Map(
        acceptedOffers.map((offer) => [String(offer.ticketId), offer.price])
    );

    const invoicedTicketIds = new Set(
        invoices
            .filter((invoice) => invoice.status !== "CANCELLED")
            .map((invoice) =>
                String(invoice.ticketId?._id || invoice.ticketId)
            )
    );

    const uninvoicedMaintenance = tickets.filter(
        (ticket) =>
            priceByTicket.has(String(ticket._id)) &&
            !invoicedTicketIds.has(String(ticket._id))
    );

    const maintenanceDue = uninvoicedMaintenance.reduce(
        (sum, ticket) => sum + (priceByTicket.get(String(ticket._id)) || 0),
        0
    );

    // A closed job is finished work, so its agreed price is real money the
    // resident owes the moment the ticket closes — waiting for the admin to
    // raise the invoice first would hide it. Anything invoiced is already
    // counted from the invoice, so only uninvoiced closed tickets are added
    // here and nothing is counted twice.
    const closedUninvoicedTickets = uninvoicedMaintenance.filter(
        (ticket) => ticket.status === "CLOSED"
    );

    const closedMaintenanceValue = closedUninvoicedTickets.reduce(
        (sum, ticket) => sum + (priceByTicket.get(String(ticket._id)) || 0),
        0
    );

    // ---------------- Billing ----------------
    const unpaidInvoices = invoices.filter((invoice) =>
        UNPAID_INVOICE_STATUSES.includes(invoice.status)
    );

    const invoicesDue = unpaidInvoices.reduce(
        (sum, invoice) => sum + (invoice.amount || 0),
        0
    );

    // Everything the resident has actually settled: invoices the admin has
    // confirmed as PAID. Maintenance the resident paid is settled through an
    // invoice too, so counting PAID invoices covers both bills and maintenance
    // without double counting.
    const paidInvoices = invoices.filter((invoice) => invoice.status === "PAID");

    const paidBalance = paidInvoices.reduce(
        (sum, invoice) => sum + (invoice.amount || 0),
        0
    );

    // The same total, split by what the resident is paying for. A maintenance
    // bill is issued against a ticket, so an invoice with a ticketId is
    // maintenance work and one without it is a compound bill. Both halves stay
    // derived from PAID invoices only, so they always add up to paidBalance.
    const hasTicket = (invoice) => Boolean(invoice.ticketId);

    const paidMaintenance = paidInvoices
        .filter(hasTicket)
        .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

    const paidInvoicesTotal = paidInvoices
        .filter((invoice) => !hasTicket(invoice))
        .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

    const latestInvoice = invoices[0]
        ? {
            _id: invoices[0]._id,
            amount: invoices[0].amount,
            status: invoices[0].status,
            dueDate: invoices[0].dueDate,
            issueDate: invoices[0].createdAt,
            paidAt: invoices[0].paidAt,
            ticketTitle: invoices[0].ticketId?.title || null,
        }
        : null;

    return {
        tickets: ticketStats,
        recentTickets: tickets.slice(0, 4).map((ticket) => ({
            ...ticket,
            price: priceByTicket.get(String(ticket._id)) ?? null,
        })),
        billing: {
            outstandingBalance: invoicesDue + maintenanceDue,
            invoicesDue,
            maintenanceDue,
            paidBalance,
            // How paidBalance breaks down: maintenance jobs vs compound bills.
            paidMaintenance,
            paidInvoicesTotal,
            unpaidInvoicesCount: unpaidInvoices.length,
            uninvoicedMaintenanceCount: uninvoicedMaintenance.length,
            // Closed jobs whose invoice has not been raised yet. Surfaced so the
            // dashboard can show the price as soon as the ticket closes.
            closedMaintenanceValue,
            closedMaintenanceCount: closedUninvoicedTickets.length,
            latestInvoice,
            // Full billing history for the resident invoices screen, so it
            // does not need a second round-trip to render.
            invoices: invoices.map((invoice) => ({
                _id: invoice._id,
                amount: invoice.amount,
                status: invoice.status,
                dueDate: invoice.dueDate,
                issueDate: invoice.createdAt,
                paidAt: invoice.paidAt,
                description: invoice.description,
                ticketId: invoice.ticketId?._id || null,
                ticketTitle: invoice.ticketId?.title || null,
                ticketCategory: invoice.ticketId?.category || null,
                // Carried so the resident's receipt renders the same unit
                // block as the admin one, without a second request.
                unitId: invoice.unitId || null
            }))
        },
        visitors: {
            thisMonth: visitsThisMonth,
            pendingRequests: pendingVisitorRequests,
            recent: recentVisits,
        },
    };
};

module.exports = {
    getResidentDashboard,
};
