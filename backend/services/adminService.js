const User = require("../models/user");
const Building = require("../models/building");
const Unit = require("../models/unit");
const Invoice = require("../models/invoice");
const MaintenanceTicket = require("../models/maintenanceTicket");
const { createNotification } = require("./notificationService");
const Visit = require("../models/visit");

const getAllUsers = async (filters = {}) => {
    const query = {};

    if (filters.role) {
        query.role = filters.role;
    }

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.search) {
        const searchRegex = new RegExp(
            filters.search,
            "i"
        );

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

    await building.save();

    return building;
};

const getUnits = async (filters = {}) => {
    const query = {};

    if (filters.buildingId) {
        query.buildingId =
            filters.buildingId;
    }

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.type) {
        query.type = filters.type;
    }

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
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.residentId) {
        query.residentId =
            filters.residentId;
    }

    if (filters.ticketId) {
        query.ticketId =
            filters.ticketId;
    }

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

const createInvoice = async (
    data
) => {
    const {
        residentId,
        ticketId,
        amount,
        dueDate,
    } = data;

    if (
        !residentId ||
        !ticketId ||
        amount === undefined ||
        !dueDate
    ) {
        throw new Error(
            "Resident, ticket, amount and due date are required"
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

    return invoice;
};

const updateInvoiceStatus = async (
    invoiceId,
    status
) => {
    const allowedStatuses = [
        "PENDING",
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

    const allowedTransitions = {
        PENDING: [
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
        status === "OVERDUE" ||
        status === "CANCELLED"
    ) {
        invoice.paidAt = null;
    }

    await invoice.save();

    if (status === "OVERDUE" && previousStatus !== "OVERDUE") {
        await createNotification({
            userId: invoice.residentId,
            type: "INVOICE_DUE",
            title: "Invoice overdue",
            message: "A maintenance invoice is now overdue.",
            relatedId: invoice._id,
        });
    }

    return invoice;
};

const getMaintenanceTickets = async (
    filters = {}
) => {
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.priority) {
        query.priority =
            filters.priority;
    }

    if (filters.category) {
        query.category =
            filters.category;
    }

    if (filters.residentId) {
        query.residentId =
            filters.residentId;
    }

    if (filters.assignedTo) {
        query.assignedTo =
            filters.assignedTo;
    }

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
                "name email phone role rating totalReviews"
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

    return ticket;
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
        await ticket.save();

        if (status !== previousStatus) {
            await createNotification({
                userId: ticket.residentId,
                type: "TICKET_STATUS_CHANGED",
                title: "Maintenance request updated",
                message: `Maintenance request "${ticket.title}" is now ${status.toLowerCase().replace("_", " ")}.`,
                relatedId: ticket._id,
            });
        }

        return ticket;
    };

const getVisits = async (
    filters = {}
) => {
    const query = {};

    if (filters.status) {
        query.status =
            filters.status;
    }

    if (filters.residentId) {
        query.residentId =
            filters.residentId;
    }

    if (filters.buildingId) {
        query.buildingId =
            filters.buildingId;
    }

    if (filters.unitId) {
        query.unitId =
            filters.unitId;
    }

    if (filters.source) {
        query.source =
            filters.source;
    }

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
            },

            visits: {
                total: totalVisits,
            },
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
            },

            units: {
                byStatus:
                    unitsByStatus,
            },
        };
    };

module.exports = {
    getAllUsers,
    getUserById,
    approveUser,
    rejectUser,
    getBuildings,
    createBuilding,
    updateBuilding,
    getUnits,
    createUnit,
    updateUnit,
    getInvoices,
    createInvoice,
    updateInvoiceStatus,
    getMaintenanceTickets,
    getMaintenanceTicketById,
    updateMaintenanceTicketStatus,
    getVisits,
    getVisitById,
    getDashboardOverview,
    getReportsAndAnalytics,
};
