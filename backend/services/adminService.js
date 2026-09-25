const User = require("../models/user");
const Building = require("../models/building");
const Unit = require("../models/unit");
const Invoice = require("../models/invoice");
const MaintenanceTicket = require("../models/maintenanceTicket");
const Review = require("../models/review");
const { createNotification, notifyRole } = require("./notificationService");
const { syncResidentGroupMemberships } = require("./chatService");
const { isTicketChatLocked } = require("../utils/statusConstants");
const Visit = require("../models/visit");

/**
 * Normalise a filter value coming from a query string or dropdown.
 *
 * `ALL`, empty string, and the literal strings "undefined"/"null" all mean
 * "no filter". Before this existed, `?status=ALL` was passed straight into the
 * Mongo query and matched nothing — which is why selecting ALL in an admin
 * dropdown returned an empty table.
 */
const normalizeFilter = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    const text = String(value).trim();

    if (!text || text.toUpperCase() === "ALL") {
        return null;
    }

    if (text === "undefined" || text === "null") {
        return null;
    }

    return text;
};

/**
 * Build a Mongo query from an allow-list of (filter field -> document path)
 * pairs, skipping any value that means "everything".
 */
const buildFilterQuery = (filters, fieldMap) => {
    const query = {};

    for (const [field, path] of Object.entries(fieldMap)) {
        const value = normalizeFilter(filters[field]);

        if (value !== null) {
            query[path] = value;
        }
    }

    return query;
};

/**
 * Best-effort membership sync for the default system groups.
 *
 * A chat-group failure must never reject a successful approval, so the error
 * is logged and swallowed, exactly like notification fan-out.
 */
const syncGroupsSilently = async (user) => {
    try {
        await syncResidentGroupMemberships(user);
    } catch (error) {
        console.error(
            "Failed to sync default chat groups:",
            error.message
        );
    }
};

const getAllUsers = async (filters = {}) => {
    const query = buildFilterQuery(filters, {
        role: "role",
        status: "status",
    });

    const search = normalizeFilter(filters.search);

    if (search) {
        const searchRegex = new RegExp(search, "i");

        query.$or = [
            { name: searchRegex },
            { email: searchRegex },
        ];
    }

    const users = await User.find(query)
        .select("-password")
        .populate(
            "unitId",
            "unitNumber floor type status buildingId"
        )
        .sort({ createdAt: -1 });

    return users;
};

const getUserById = async (userId) => {
    const user = await User.findById(userId)
        .select("-password")
        .populate(
            "unitId",
            "unitNumber floor type status buildingId"
        );

    if (!user) {
        throw new Error("User not found");
    }

    return user;
};

const approveUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (user.status !== "PENDING") {
        throw new Error(
            "Only pending users can be approved"
        );
    }

    if (user.role !== "RESIDENT") {
        user.status = "ACTIVE";

        await user.save();

        await createNotification({
            userId: user._id,
            type: "ACCOUNT_APPROVED",
            title: "Account approved",
            message: "Your CivicSync account is ready to use.",
            relatedId: user._id,
        });

        return user;
    }
    if (!user.unitId) {
        throw new Error(
            "Resident must have a unit"
        );
    }

    const unit = await Unit.findOneAndUpdate(
        {
            _id: user.unitId,
            status: "VACANT",
        },
        {
            $set: {
                status: "OCCUPIED",
            },
        },
        {
            new: true,
        }
    );

    if (!unit) {
        throw new Error(
            "Unit is already occupied or unavailable"
        );
    }

    try {
        user.status = "ACTIVE";

        await user.save();

        await createNotification({
            userId: user._id,
            type: "ACCOUNT_APPROVED",
            title: "Account approved",
            message: "Your CivicSync account is ready to use.",
            relatedId: user._id,
        });

        // A newly approved resident joins the compound + building groups so
        // both conversations appear in their chat list immediately.
        await syncGroupsSilently(user);

        return user;
    } catch (error) {
        await Unit.findOneAndUpdate(
            {
                _id: unit._id,
                status: "OCCUPIED",
            },
            {
                $set: {
                    status: "VACANT",
                },
            }
        );

        throw error;
    }
};

const rejectUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (user.status !== "PENDING") {
        throw new Error(
            "Only pending users can be rejected"
        );
    }

    const unitId = user.unitId;

    user.status = "REJECTED";
    user.unitId = null;

    await user.save();

    if (unitId) {
        const activeOrPendingResident =
            await User.exists({
                role: "RESIDENT",
                status: {
                    $in: ["PENDING", "ACTIVE"],
                },
                unitId,
            });

        if (!activeOrPendingResident) {
            await Unit.findOneAndUpdate(
                {
                    _id: unitId,
                    status: "OCCUPIED",
                },
                {
                    $set: {
                        status: "VACANT",
                    },
                }
            );
        }
    }

    return user;
};

/**
 * Update the fields an admin is allowed to touch on any account.
 *
 * Deliberately limited to EMAIL and PHONE. A user's display name is their own
 * identity and is owned by the profile page (`PATCH /api/auth/me`), so an
 * admin editing it here would silently rename somebody else's account.
 * Any `name` sent by the client is ignored rather than rejected, so an older
 * client that still posts it does not break.
 */
const updateUser = async (userId, data = {}) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (data.phone !== undefined) {
        user.phone = data.phone ? String(data.phone).trim() : null;
    }

    if (data.email !== undefined) {
        const normalizedEmail = String(data.email).trim().toLowerCase();

        if (!normalizedEmail) {
            throw new Error("Email is required");
        }

        const existing = await User.findOne({
            email: normalizedEmail,
            _id: { $ne: user._id },
        });

        if (existing) {
            throw new Error("Email is already in use");
        }

        user.email = normalizedEmail;
    }

    await user.save();

    return user;
};

const getBuildings = async () => {
    const buildings = await Building.find().sort({
        buildingNumber: 1,
    });

    return buildings;
};

const createBuilding = async (data) => {
    const {
        name,
        buildingNumber,
        description,
        imageUrl,
        floorsCount,
        unitsCount,
    } = data;

    if (
        !name ||
        buildingNumber === undefined ||
        floorsCount === undefined
    ) {
        throw new Error(
            "Name, building number and floors count are required"
        );
    }

    const existingBuilding =
        await Building.findOne({
            buildingNumber,
        });

    if (existingBuilding) {
        throw new Error(
            "Building number already exists"
        );
    }

    const building = await Building.create({
        name,
        buildingNumber,
        description:
            description || null,
        imageUrl: imageUrl || null,
        floorsCount,
        unitsCount: unitsCount ?? 0,
    });

    return building;
};

const updateBuilding = async (
    buildingId,
    data
) => {
    const building =
        await Building.findById(buildingId);

    if (!building) {
        throw new Error("Building not found");
    }

    if (
        data.buildingNumber !== undefined &&
        data.buildingNumber !==
            building.buildingNumber
    ) {
        const existingBuilding =
            await Building.findOne({
                buildingNumber:
                    data.buildingNumber,
                _id: {
                    $ne: buildingId,
                },
            });

        if (existingBuilding) {
            throw new Error(
                "Building number already exists"
            );
        }

        building.buildingNumber =
            data.buildingNumber;
    }

    if (data.name !== undefined) {
        building.name = data.name;
    }

    if (data.description !== undefined) {
        building.description =
            data.description;
    }

    if (data.imageUrl !== undefined) {
        building.imageUrl = data.imageUrl;
    }

    if (data.floorsCount !== undefined) {
        building.floorsCount =
            data.floorsCount;
    }

    if (data.unitsCount !== undefined) {
        building.unitsCount = data.unitsCount;
    }

    await building.save();

    return building;
};

const getUnits = async (filters = {}) => {
    const query = buildFilterQuery(filters, {
        buildingId: "buildingId",
        status: "status",
        type: "type",
    });

    const units = await Unit.find(query)
        .populate(
            "buildingId",
            "name buildingNumber description imageUrl floorsCount"
        )
        .sort({
            buildingId: 1,
            floor: 1,
            unitNumber: 1,
        });

    return units;
};

const createUnit = async (data) => {
    const {
        buildingId,
        unitNumber,
        floor,
        type,
        status,
    } = data;

    if (
        !buildingId ||
        unitNumber === undefined ||
        floor === undefined ||
        !type
    ) {
        throw new Error(
            "Building, unit number, floor and type are required"
        );
    }

    const building =
        await Building.findById(buildingId);

    if (!building) {
        throw new Error(
            "Building not found"
        );
    }

    const existingUnit =
        await Unit.findOne({
            buildingId,
            unitNumber,
        });

    if (existingUnit) {
        throw new Error(
            "Unit number already exists in this building"
        );
    }

    const unit = await Unit.create({
        buildingId,
        unitNumber,
        floor,
        type,
        status:
            status || "VACANT",
    });

    return unit;
};

const updateUnit = async (
    unitId,
    data
) => {
    const unit =
        await Unit.findById(unitId);

    if (!unit) {
        throw new Error(
            "Unit not found"
        );
    }

    const residentUsingUnit =
        await User.findOne({
            role: "RESIDENT",
            status: {
                $in: [
                    "PENDING",
                    "ACTIVE",
                ],
            },
            unitId: unit._id,
        });

    const hasResident =
        !!residentUsingUnit;

    if (
        data.buildingId !== undefined &&
        data.buildingId.toString() !==
            unit.buildingId.toString()
    ) {
        if (hasResident) {
            throw new Error(
                "Cannot move a unit assigned to a resident"
            );
        }

        const building =
            await Building.findById(
                data.buildingId
            );

        if (!building) {
            throw new Error(
                "Building not found"
            );
        }

        unit.buildingId =
            data.buildingId;
    }

    if (data.unitNumber !== undefined) {
        if (hasResident) {
            throw new Error(
                "Cannot change the unit number of an assigned unit"
            );
        }

        unit.unitNumber =
            data.unitNumber;
    }

    if (data.floor !== undefined) {
        if (hasResident) {
            throw new Error(
                "Cannot change the floor of an assigned unit"
            );
        }

        unit.floor = data.floor;
    }

    if (data.type !== undefined) {
        if (hasResident) {
            throw new Error(
                "Cannot change the type of an assigned unit"
            );
        }

        unit.type = data.type;
    }

    if (data.status !== undefined) {
        if (
            hasResident &&
            data.status === "VACANT"
        ) {
            throw new Error(
                "Cannot mark an assigned unit as vacant"
            );
        }

        if (
            !hasResident &&
            data.status === "OCCUPIED"
        ) {
            throw new Error(
                "Cannot mark an unassigned unit as occupied"
            );
        }

        unit.status = data.status;
    }

    const duplicateUnit =
        await Unit.findOne({
            buildingId:
                unit.buildingId,
            unitNumber:
                unit.unitNumber,
            _id: {
                $ne: unitId,
            },
        });

    if (duplicateUnit) {
        throw new Error(
            "Unit number already exists in this building"
        );
    }

    await unit.save();

    return unit;
};

const getInvoices = async (
    filters = {}
) => {
    const query = buildFilterQuery(filters, {
        status: "status",
        residentId: "residentId",
        ticketId: "ticketId",
    });

    const invoices = await Invoice.find(
        query
    )
        .populate(
            "residentId",
            "name email phone role status unitId"
        )
        .populate(
            "ticketId",
            "title category priority status"
        )
        .sort({
            createdAt: -1,
        });

    return invoices;
};

/**
 * A single invoice with everything a receipt needs to render: the resident
 * (with their unit), the originating maintenance ticket, and the unit record.
 *
 * Used by the admin invoice receipt screen and the print action, so the
 * printable view has real data instead of the row already on the client.
 */
const getInvoiceById = async (
    invoiceId
) => {
    const invoice = await Invoice.findById(invoiceId)
        .populate(
            "residentId",
            "name email phone role status unitId"
        )
        .populate(
            "ticketId",
            "title category priority status createdAt"
        )
        .populate(
            "unitId",
            "unitNumber floor type status buildingId"
        )
        .lean();

    if (!invoice) {
        const error = new Error("Invoice not found");
        error.statusCode = 404;
        throw error;
    }

    // The unit can live on the invoice or, for a ticket invoice, on the
    // resident. Fall back to the resident's unit so the receipt always shows
    // a location when one exists.
    let unit = invoice.unitId || null;

    if (!unit && invoice.residentId?.unitId) {
        unit = await Unit.findById(invoice.residentId.unitId)
            .select("unitNumber floor type status buildingId")
            .populate("buildingId", "name buildingNumber")
            .lean();
    } else if (unit && unit.buildingId) {
        unit = await Unit.findById(unit._id)
            .select("unitNumber floor type status buildingId")
            .populate("buildingId", "name buildingNumber")
            .lean();
    }

    return {
        ...invoice,
        unit,
    };
};

const createInvoice = async (
    data
) => {
    const {
        residentId,
        ticketId,
        unitId,
        description,
        amount,
        dueDate,
    } = data;

    if (
        !residentId ||
        amount === undefined ||
        !dueDate
    ) {
        throw new Error(
            "Resident, amount and due date are required"
        );
    }

    const resident =
        await User.findById(
            residentId
        );

    if (!resident) {
        throw new Error(
            "Resident not found"
        );
    }

    if (
        resident.role !==
        "RESIDENT"
    ) {
        throw new Error(
            "Invoice must belong to a resident"
        );
    }

    // Standalone invoice (no maintenance ticket): allowed for any resident /
    // unit. The admin console uses this to bill residents directly.
    if (!ticketId) {
        const invoice = await Invoice.create({
            residentId,
            ticketId: null,
            unitId: unitId || resident.unitId || null,
            description: description || null,
            amount,
            dueDate,
            status: "PENDING",
            paidAt: null,
        });

        await createNotification({
            userId: residentId,
            type: "INVOICE_CREATED",
            title: "New invoice",
            message: `A new invoice for ${amount} has been issued to your account.`,
            relatedId: invoice._id,
        });

        return invoice;
    }

    const ticket =
        await MaintenanceTicket.findById(
            ticketId
        );

    if (!ticket) {
        throw new Error(
            "Maintenance ticket not found"
        );
    }

    if (
        ticket.residentId.toString() !==
        residentId.toString()
    ) {
        throw new Error(
            "Invoice resident must match ticket resident"
        );
    }

    if (ticket.status !== "CLOSED") {
        throw new Error(
            "Invoice can only be created for a closed ticket"
        );
    }

    const existingInvoice =
        await Invoice.findOne({
            ticketId,
        });

    if (existingInvoice) {
        throw new Error(
            "An invoice already exists for this ticket"
        );
    }

    const invoice =
        await Invoice.create({
            residentId,
            ticketId,
            unitId: unitId || resident.unitId || null,
            description: description || null,
            amount,
            dueDate,
            status: "PENDING",
            paidAt: null,
        });

    await createNotification({
        userId: residentId,
        type: "INVOICE_CREATED",
        title: "New invoice",
        message: `An invoice for ${amount} is ready for your maintenance request.`,
        relatedId: invoice._id,
    });

    // Keep the other admins' invoices list and dashboard in step, and let the
    // technician on the job know the work has been billed.
    await notifyRole("ADMIN", {
        type: "INVOICE_CREATED",
        title: "Invoice raised",
        message: `An invoice for ${amount} was raised for \"${ticket.title}\".`,
        relatedId: invoice._id,
    });

    if (ticket.assignedTo) {
        await createNotification({
            userId: ticket.assignedTo,
            type: "INVOICE_CREATED",
            title: "Job invoice raised",
            message: `The job \"${ticket.title}\" has been invoiced to the resident.`,
            relatedId: invoice._id,
        });
    }

    return invoice;
};

const updateInvoiceStatus = async (
    invoiceId,
    status
) => {
    const allowedStatuses = [
        "PENDING",
        "PAYMENT_SUBMITTED",
        "PAID",
        "OVERDUE",
        "CANCELLED",
    ];

    if (
        !allowedStatuses.includes(
            status
        )
    ) {
        throw new Error(
            "Invalid invoice status"
        );
    }

    const invoice =
        await Invoice.findById(
            invoiceId
        );

    if (!invoice) {
        throw new Error(
            "Invoice not found"
        );
    }

    // Admin transitions. PAYMENT_SUBMITTED is the resident's claim; only the
    // admin can move it on to PAID (approve) or back to OVERDUE / CANCELLED.
    const allowedTransitions = {
        PENDING: [
            "PAID",
            "OVERDUE",
            "CANCELLED",
        ],
        PAYMENT_SUBMITTED: [
            "PAID",
            "OVERDUE",
            "CANCELLED",
        ],
        OVERDUE: [
            "PAID",
            "CANCELLED",
        ],
        PAID: [],
        CANCELLED: [],
    };

    if (
        status !== invoice.status &&
        !allowedTransitions[
            invoice.status
        ].includes(status)
    ) {
        throw new Error(
            `Cannot change invoice status from ${invoice.status} to ${status}`
        );
    }

    const previousStatus = invoice.status;
    invoice.status = status;

    if (status === "PAID") {
        invoice.paidAt =
            invoice.paidAt ||
            new Date();
    } else if (
        status === "PENDING" ||
        status === "PAYMENT_SUBMITTED" ||
        status === "OVERDUE" ||
        status === "CANCELLED"
    ) {
        invoice.paidAt = null;
    }

    await invoice.save();

    if (status === "PAID" && previousStatus !== "PAID") {
            await createNotification({
                userId: invoice.residentId,
                type: "INVOICE_PAID",
                title: "Payment confirmed",
                message: `Your payment of ${invoice.amount} has been confirmed. Thank you.`,
                relatedId: invoice._id,
            });
            }

            if (status === "OVERDUE" && previousStatus !== "OVERDUE") {
                await createNotification({
                    userId: invoice.residentId,
                    type: "INVOICE_DUE",
                    title: "Invoice overdue",
                    message: "A maintenance invoice is now overdue.",
                    relatedId: invoice._id,
                });
            }

            // Any other transition (e.g. PENDING -> CANCELLED) still has to reach the
            // resident, otherwise their invoices page keeps showing a status the admin
            // has already changed.
            if (
                status !== previousStatus &&
                status !== "PAID" &&
                status !== "OVERDUE"
            ) {
                await createNotification({
                    userId: invoice.residentId,
                    type: "INVOICE_UPDATED",
                    title: "Invoice updated",
                    message: `Invoice INV-${String(invoice._id)
                        .slice(-6)
                        .toUpperCase()} is now ${status.toLowerCase()}.`,
                    relatedId: invoice._id,
                });
            }

            // ------------------------------------------------------------------
            // Realtime fan-out to the OTHER parties watching this invoice.
            //
            // The calls above only reach the resident. Without this, the admin
            // invoices list and dashboard stayed stale after a status change (the
            // admin who made the change never gets told, and a second admin watching
            // the compound is not a recipient at all), and the assigned technician
            // never learned that the bill for their job had been settled.
            //
            // This notifies: every active ADMIN (drives admin invoices + dashboard)
            // and the technician on the originating ticket, when there is one.
            // ------------------------------------------------------------------
            if (status !== previousStatus) {
                await notifyRole("ADMIN", {
                    type: "INVOICE_UPDATED",
                    title: "Invoice updated",
                    message: `Invoice INV-${String(invoice._id)
                        .slice(-6)
                        .toUpperCase()} is now ${status.toLowerCase()}.`,
                    relatedId: invoice._id,
                });

                if (invoice.ticketId) {
                    const ticket = await MaintenanceTicket.findById(invoice.ticketId)
                        .select("assignedTo title")
                        .lean();

                    if (ticket?.assignedTo) {
                        await createNotification({
                            userId: ticket.assignedTo,
                            type: "INVOICE_UPDATED",
                            title: "Job invoice updated",
                            message: `The invoice for \"${ticket.title}\" is now ${status.toLowerCase()}.`,
                            relatedId: invoice._id,
                        });
                    }
                }
            }

            return invoice;
        };

const getMaintenanceTickets = async (
    filters = {}
) => {
    const query = buildFilterQuery(filters, {
        status: "status",
        priority: "priority",
        category: "category",
        residentId: "residentId",
        assignedTo: "assignedTo",
    });

    const tickets =
        await MaintenanceTicket.find(
            query
        )
            .populate(
                "residentId",
                "name email phone unitId"
            )
            .populate(
                "assignedTo",
                "name email phone role rating totalReviews"
            )
            .populate(
                "skippedBy",
                "name email"
            )
            .sort({
                createdAt: -1,
            });

    return tickets;
};

const getMaintenanceTicketById = async (
    ticketId
) => {
    const ticket =
        await MaintenanceTicket.findById(
            ticketId
        )
            .populate(
                "residentId",
                "name email phone unitId"
            )
            .populate(
                "assignedTo",
                "name email phone role rating totalReviews specializations"
            )
            .populate(
                "skippedBy",
                "name email"
            );

    if (!ticket) {
        throw new Error(
            "Maintenance ticket not found"
        );
    }

    // The admin console needs the resolution outcome, not just the ticket row:
    // the resident's review (who rated which technician, and how) plus the
    // invoice that was raised for this job, if any.
    const [review, invoice, location] = await Promise.all([
        Review.findOne({ ticketId: ticket._id })
            .populate("residentId", "name email")
            .populate("technicianId", "name email role"),
        Invoice.findOne({ ticketId: ticket._id })
            .select("amount status dueDate paidAt description createdAt")
            .lean(),
        getTicketLocation(ticket.residentId),
    ]);

    return {
        ticket,
        review,
        invoice,
        location,
    };
};

/**
 * Resolve the building + unit a resident lives in, so the admin can see where
 * a ticket physically is. Mirrors the technician-side helper.
 */
const getTicketLocation = async (resident) => {
    const unitId =
        resident && resident.unitId ? resident.unitId : null;

    if (!unitId) {
        return null;
    }

    const unit = await Unit.findById(unitId)
        .select("unitNumber floor type status buildingId")
        .populate("buildingId", "name buildingNumber")
        .lean();

    if (!unit) {
        return null;
    }

    return {
        unitNumber: unit.unitNumber,
        floor: unit.floor,
        type: unit.type,
        status: unit.status,
        buildingName: unit.buildingId?.name || null,
        buildingNumber: unit.buildingId?.buildingNumber ?? null,
    };
};

const updateMaintenanceTicketStatus =
    async (
        ticketId,
        status
    ) => {
        const allowedStatuses = [
            "OPEN",
            "ASSIGNED",
            "IN_PROGRESS",
            "RESOLVED",
            "CLOSED",
        ];

        if (
            !allowedStatuses.includes(
                status
            )
        ) {
            throw new Error(
                "Invalid maintenance status"
            );
        }

        const ticket =
            await MaintenanceTicket.findById(
                ticketId
            );

        if (!ticket) {
            throw new Error(
                "Maintenance ticket not found"
            );
        }

        const allowedTransitions = {
            OPEN: ["ASSIGNED"],
            ASSIGNED: ["IN_PROGRESS"],
            IN_PROGRESS: ["RESOLVED"],
            RESOLVED: ["CLOSED"],
            CLOSED: [],
        };

        if (
            status !== ticket.status &&
            !allowedTransitions[
                ticket.status
            ].includes(status)
        ) {
            throw new Error(
                `Cannot change maintenance status from ${ticket.status} to ${status}`
            );
        }

        if (
            status === "ASSIGNED" &&
            !ticket.assignedTo
        ) {
            throw new Error(
                "Ticket must have an assigned technician"
            );
        }

        if (
            status === "IN_PROGRESS" &&
            !ticket.assignedTo
        ) {
            throw new Error(
                "Ticket must have an assigned technician"
            );
        }

        const previousStatus = ticket.status;
        ticket.status = status;
        // Keep the persisted lock flag in step with the state machine so a
        // ticket finished from the admin console closes its chat as well.
        ticket.chatLocked = isTicketChatLocked(status);
        await ticket.save();

        if (status !== previousStatus) {
            await createNotification({
                userId: ticket.residentId,
                type: "TICKET_STATUS_CHANGED",
                title: "Maintenance request updated",
                message: `Maintenance request "${ticket.title}" is now ${status.toLowerCase().replace("_", " ")}.`,
                relatedId: ticket._id,
            });

            // The assigned technician tracks the same job and needs to see an
            // admin-driven change (e.g. force-closing it) without a reload.
            if (ticket.assignedTo) {
                await createNotification({
                    userId: ticket.assignedTo,
                    type: "TICKET_STATUS_CHANGED",
                    title: "Maintenance request updated",
                    message: `"${ticket.title}" is now ${status.toLowerCase().replace("_", " ")}.`,
                    relatedId: ticket._id,
                });
            }
        }

        return ticket;
    };

const getVisits = async (
    filters = {}
) => {
    const query = buildFilterQuery(filters, {
        status: "status",
        residentId: "residentId",
        buildingId: "buildingId",
        unitId: "unitId",
        source: "source",
    });

    const visits = await Visit.find(
        query
    )
        .populate(
            "residentId",
            "name email phone unitId"
        )
        .populate(
            "buildingId",
            "name buildingNumber"
        )
        .populate(
            "unitId",
            "unitNumber floor type status"
        )
        .populate(
            "securityId",
            "name email phone role"
        )
        .populate(
            "qrScannedBy",
            "name email phone role"
        )
        .sort({
            visitDate: -1,
            createdAt: -1,
        });

    return visits;
};

const getVisitById = async (
    visitId
) => {
    const visit =
        await Visit.findById(
            visitId
        )
            .populate(
                "residentId",
                "name email phone unitId"
            )
            .populate(
                "buildingId",
                "name buildingNumber description imageUrl floorsCount"
            )
            .populate(
                "unitId",
                "unitNumber floor type status"
            )
            .populate(
                "securityId",
                "name email phone role"
            )
            .populate(
                "qrScannedBy",
                "name email phone role"
            );

    if (!visit) {
        throw new Error(
            "Visit not found"
        );
    }

    return visit;
};

const getDashboardOverview =
    async () => {
        const [
            totalUsers,
            pendingUsers,
            activeResidents,
            activeTechnicians,
            activeSecurity,
            totalBuildings,
            totalUnits,
            occupiedUnits,
            vacantUnits,
            openMaintenance,
            overdueInvoices,
            totalVisits,
            invoiceTotals,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({
                status: "PENDING",
            }),
            User.countDocuments({
                role: "RESIDENT",
                status: "ACTIVE",
            }),
            User.countDocuments({
                role: "TECHNICIAN",
                status: "ACTIVE",
            }),
            User.countDocuments({
                role: "SECURITY",
                status: "ACTIVE",
            }),
            Building.countDocuments(),
            Unit.countDocuments(),
            Unit.countDocuments({
                status: "OCCUPIED",
            }),
            Unit.countDocuments({
                status: "VACANT",
            }),
            MaintenanceTicket.countDocuments({
                status: {
                    $in: [
                        "OPEN",
                        "ASSIGNED",
                        "IN_PROGRESS",
                    ],
                },
            }),
            Invoice.countDocuments({
                status: "OVERDUE",
            }),
            Visit.countDocuments(),
            getInvoiceTotals(),
        ]);

        return {
            users: {
                total: totalUsers,
                pending: pendingUsers,
                activeResidents,
                activeTechnicians,
                activeSecurity,
            },

            buildings: {
                total: totalBuildings,
            },

            units: {
                total: totalUnits,
                occupied: occupiedUnits,
                vacant: vacantUnits,
            },

            maintenance: {
                open: openMaintenance,
            },

            invoices: {
                overdue: overdueInvoices,
                // Financial headline numbers, summed directly from the invoice
                // collection so they can never drift from the invoices table.
                totalBilled: invoiceTotals.totalBilled,
                totalCollected: invoiceTotals.totalCollected,
                totalOutstanding: invoiceTotals.totalOutstanding,
                awaitingApproval: invoiceTotals.awaitingApproval,
            },

            visits: {
                total: totalVisits,
            },
        };
    };

/**
 * Compound-wide money totals.
 *
 * `totalBilled` is the sum of every non-cancelled invoice ever generated;
 * `totalCollected` is only what has actually been confirmed as PAID. Cancelled
 * invoices are excluded from billing entirely — they were never owed.
 */
const getInvoiceTotals = async () => {
    const rows = await Invoice.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
                total: { $sum: "$amount" },
            },
        },
    ]);

    const byStatus = rows.reduce((accumulator, row) => {
        accumulator[row._id] = {
            count: row.count,
            total: row.total || 0,
        };
        return accumulator;
    }, {});

    const totalBilled = rows
        .filter((row) => row._id !== "CANCELLED")
        .reduce((sum, row) => sum + (row.total || 0), 0);

    const totalCollected = byStatus.PAID?.total || 0;

    const totalOutstanding = ["PENDING", "OVERDUE", "PAYMENT_SUBMITTED"]
        .reduce((sum, status) => sum + (byStatus[status]?.total || 0), 0);

    return {
        totalBilled,
        totalCollected,
        totalOutstanding,
        awaitingApproval: byStatus.PAYMENT_SUBMITTED?.count || 0,
    };
};

const getReportsAndAnalytics =
    async () => {
        const [
            usersByRole,
            usersByStatus,
            maintenanceByStatus,
            maintenanceByPriority,
            invoicesByStatus,
            visitsByStatus,
            unitsByStatus,
            visitsOverTime,
            revenueSummary,
        ] = await Promise.all([
            User.aggregate([
                {
                    $group: {
                        _id: "$role",
                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]),

            User.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]),

            MaintenanceTicket.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]),

            MaintenanceTicket.aggregate([
                {
                    $group: {
                        _id: "$priority",
                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]),

            Invoice.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: {
                            $sum: 1,
                        },
                        totalAmount: {
                            $sum: "$amount",
                        },
                    },
                },
            ]),

            Visit.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]),

            Unit.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]),

            // Visitors per day for the last 30 days, zero-filled on the client
            // so gaps in the chart read as "no visits", not "no data".
            getVisitsOverTime(30),

            getRevenueSummary(),
        ]);

        return {
            users: {
                byRole: usersByRole,
                byStatus: usersByStatus,
            },

            maintenance: {
                byStatus:
                    maintenanceByStatus,
                byPriority:
                    maintenanceByPriority,
            },

            invoices: {
                byStatus:
                    invoicesByStatus,
            },

            visits: {
                byStatus:
                    visitsByStatus,
                overTime:
                    visitsOverTime,
            },

            units: {
                byStatus:
                    unitsByStatus,
            },

            revenue: revenueSummary,
        };
    };

/**
 * Visits grouped by calendar day for the trailing `days` window.
 *
 * Uses the visit DATE (not createdAt) so the series matches the operational
 * meaning of "visits on a day".
 */
const getVisitsOverTime = async (days = 30) => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const rows = await Visit.aggregate([
        {
            $match: {
                visitDate: { $gte: since },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$visitDate",
                    },
                },
                count: { $sum: 1 },
                checkedIn: {
                    $sum: {
                        $cond: [
                            { $eq: ["$status", "CHECKED_IN"] },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return rows.map((row) => ({
        date: row._id,
        count: row.count,
        checkedIn: row.checkedIn,
    }));
};

/** Totals the billing console needs for its summary cards. */
const getRevenueSummary = async () => {
    const rows = await Invoice.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
                total: { $sum: "$amount" },
            },
        },
    ]);

    const byStatus = rows.reduce((accumulator, row) => {
        accumulator[row._id] = {
            count: row.count,
            total: row.total || 0,
        };
        return accumulator;
    }, {});

    const totals = await getInvoiceTotals();

    return {
        totalBilled: totals.totalBilled,
        paid: totals.totalCollected,
        outstanding: totals.totalOutstanding,
        overdue: byStatus.OVERDUE?.total || 0,
        awaitingApproval: totals.awaitingApproval,
        byStatus,
    };
};

/**
 * The complete compound dataset behind the "Download full report" button.
 *
 * Returned as structured JSON so the client can render CSV or PDF from one
 * source of truth, instead of the server deciding a file format.
 */
const getFullCompoundReport = async () => {
    const [dashboard, analytics, users, buildings, units, tickets, invoices, visits] =
        await Promise.all([
            getDashboardOverview(),
            getReportsAndAnalytics(),
            User.find()
                .select("name email phone role status unitId createdAt")
                .populate("unitId", "unitNumber floor type buildingId")
                .sort({ createdAt: -1 }),
            Building.find().sort({ buildingNumber: 1 }),
            Unit.find()
                .populate("buildingId", "name buildingNumber")
                .sort({ buildingId: 1, floor: 1, unitNumber: 1 }),
            MaintenanceTicket.find()
                .populate("residentId", "name email")
                .populate("assignedTo", "name email")
                .sort({ createdAt: -1 }),
            Invoice.find()
                .populate("residentId", "name email")
                .sort({ createdAt: -1 }),
            Visit.find()
                .populate("buildingId", "name buildingNumber")
                .populate("unitId", "unitNumber floor")
                .sort({ visitDate: -1 })
                .limit(500),
        ]);

    return {
        generatedAt: new Date().toISOString(),
        overview: dashboard,
        analytics,
        users,
        buildings,
        units,
        maintenance: tickets,
        invoices,
        visits,
    };
};

module.exports = {
    getAllUsers,
    getUserById,
    approveUser,
    rejectUser,
    updateUser,
    getBuildings,
    createBuilding,
    updateBuilding,
    getUnits,
    createUnit,
    updateUnit,
    getInvoices,
    getInvoiceById,
    createInvoice,
    updateInvoiceStatus,
    getMaintenanceTickets,
    getMaintenanceTicketById,
    updateMaintenanceTicketStatus,
    getVisits,
    getVisitById,
    getDashboardOverview,
    getReportsAndAnalytics,
    getFullCompoundReport,
    normalizeFilter,
};
