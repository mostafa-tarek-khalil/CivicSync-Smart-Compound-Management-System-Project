const User = require("../models/user");
const Building = require("../models/building");
const Unit = require("../models/unit");
const Invoice = require("../models/invoice");
const MaintenanceTicket = require("../models/maintenanceTicket");
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
        const searchRegex = new RegExp(filters.search, "i");

        query.$or = [
            { name: searchRegex },
            { email: searchRegex },
        ];
    }

    const users = await User.find(query)
        .select("-password")
        .populate("unitId", "unitNumber floor type status buildingId")
        .sort({ createdAt: -1 });

    return users;
};

const getUserById = async (userId) => {
    const user = await User.findById(userId)
        .select("-password")
        .populate("unitId", "unitNumber floor type status buildingId");

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
        throw new Error("Only pending users can be approved");
    }

    if (user.role === "RESIDENT") {
        if (!user.unitId) {
            throw new Error("Resident must have a unit");
        }

        const unit = await Unit.findById(user.unitId);

        if (!unit) {
            throw new Error("Unit not found");
        }

        if (unit.status === "OCCUPIED") {
            throw new Error("Unit is already occupied");
        }

        user.status = "ACTIVE";
        unit.status = "OCCUPIED";

        await user.save();
        await unit.save();

        return user;
    }

    user.status = "ACTIVE";

    await user.save();

    return user;
};

const rejectUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (user.status !== "PENDING") {
        throw new Error("Only pending users can be rejected");
    }

    user.status = "REJECTED";

    await user.save();

    return user;
};

const getBuildings = async () => {
    const buildings = await Building.find().sort({ buildingNumber: 1 });

    return buildings;
};

const createBuilding = async (data) => {
    const { name, buildingNumber, description } = data;

    if (!name || buildingNumber === undefined) {
        throw new Error("Name and building number are required");
    }

    const existingBuilding = await Building.findOne({
        buildingNumber,
    });

    if (existingBuilding) {
        throw new Error("Building number already exists");
    }

    const building = await Building.create({
        name,
        buildingNumber,
        description: description || null,
    });

    return building;
};

const updateBuilding = async (buildingId, data) => {
    const building = await Building.findById(buildingId);

    if (!building) {
        throw new Error("Building not found");
    }

    if (data.buildingNumber !== undefined && data.buildingNumber !== building.buildingNumber) {
        const existingBuilding = await Building.findOne({
            buildingNumber: data.buildingNumber,
            _id: { $ne: buildingId },
        });

        if (existingBuilding) {
            throw new Error("Building number already exists");
        }

        building.buildingNumber = data.buildingNumber;
    }

    if (data.name !== undefined) {
        building.name = data.name;
    }

    if (data.description !== undefined) {
        building.description = data.description;
    }

    await building.save();

    return building;
};

const getUnits = async (filters = {}) => {
    const query = {};

    if (filters.buildingId) {
        query.buildingId = filters.buildingId;
    }

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.type) {
        query.type = filters.type;
    }

    const units = await Unit.find(query)
        .populate("buildingId", "name buildingNumber description")
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

    if (!buildingId || unitNumber === undefined || floor === undefined || !type) {
        throw new Error("Building, unit number, floor and type are required");
    }

    const building = await Building.findById(buildingId);

    if (!building) {
        throw new Error("Building not found");
    }

    const existingUnit = await Unit.findOne({
        buildingId,
        unitNumber,
    });

    if (existingUnit) {
        throw new Error("Unit number already exists in this building");
    }

    const unit = await Unit.create({
        buildingId,
        unitNumber,
        floor,
        type,
        status: status || "VACANT",
    });

    return unit;
};

const updateUnit = async (unitId, data) => {
    const unit = await Unit.findById(unitId);

    if (!unit) {
        throw new Error("Unit not found");
    }

    if (data.buildingId !== undefined) {
        const building = await Building.findById(data.buildingId);

        if (!building) {
            throw new Error("Building not found");
        }

        unit.buildingId = data.buildingId;
    }

    if (data.unitNumber !== undefined) {
        unit.unitNumber = data.unitNumber;
    }

    if (data.floor !== undefined) {
        unit.floor = data.floor;
    }

    if (data.type !== undefined) {
        unit.type = data.type;
    }

    if (data.status !== undefined) {
        unit.status = data.status;
    }

    const duplicateUnit = await Unit.findOne({
        buildingId: unit.buildingId,
        unitNumber: unit.unitNumber,
        _id: { $ne: unitId },
    });

    if (duplicateUnit) {
        throw new Error("Unit number already exists in this building");
    }

    await unit.save();

    return unit;
};

const getInvoices = async (filters = {}) => {
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.residentId) {
        query.residentId = filters.residentId;
    }

    if (filters.ticketId) {
        query.ticketId = filters.ticketId;
    }

    const invoices = await Invoice.find(query)
        .populate("residentId", "name email phone role status unitId")
        .populate("ticketId", "title category priority status")
        .sort({ createdAt: -1 });

    return invoices;
};

const createInvoice = async (data) => {
    const {
        residentId,
        ticketId,
        amount,
        dueDate,
    } = data;

    if (!residentId || !ticketId || amount === undefined || !dueDate) {
        throw new Error("Resident, ticket, amount and due date are required");
    }

    const resident = await User.findById(residentId);

    if (!resident) {
        throw new Error("Resident not found");
    }

    if (resident.role !== "RESIDENT") {
        throw new Error("Invoice must belong to a resident");
    }

    const ticket = await MaintenanceTicket.findById(ticketId);

    if (!ticket) {
        throw new Error("Maintenance ticket not found");
    }

    if (ticket.residentId.toString() !== residentId.toString()) {
        throw new Error("Invoice resident must match ticket resident");
    }

    const existingInvoice = await Invoice.findOne({
        ticketId,
    });

    if (existingInvoice) {
        throw new Error("An invoice already exists for this ticket");
    }

    const invoice = await Invoice.create({
        residentId,
        ticketId,
        amount,
        dueDate,
        status: "PENDING",
    });

    return invoice;
};

const updateInvoiceStatus = async (invoiceId, status) => {
    const allowedStatuses = [
        "PENDING",
        "PAID",
        "OVERDUE",
        "CANCELLED",
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid invoice status");
    }

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw new Error("Invoice not found");
    }

    invoice.status = status;

    if (status === "PAID") {
        invoice.paidAt = new Date();
    } else {
        invoice.paidAt = null;
    }

    await invoice.save();

    return invoice;
};

const getMaintenanceTickets = async (filters = {}) => {
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.priority) {
        query.priority = filters.priority;
    }

    if (filters.category) {
        query.category = filters.category;
    }

    if (filters.residentId) {
        query.residentId = filters.residentId;
    }

    if (filters.assignedTo) {
        query.assignedTo = filters.assignedTo;
    }

    const tickets = await MaintenanceTicket.find(query)
        .populate("residentId", "name email phone unitId")
        .populate("assignedTo", "name email phone role rating totalReviews")
        .populate("skippedBy", "name email")
        .sort({ createdAt: -1 });

    return tickets;
};

const getMaintenanceTicketById = async (ticketId) => {
    const ticket = await MaintenanceTicket.findById(ticketId)
        .populate("residentId", "name email phone unitId")
        .populate("assignedTo", "name email phone role rating totalReviews")
        .populate("skippedBy", "name email");

    if (!ticket) {
        throw new Error("Maintenance ticket not found");
    }

    return ticket;
};

const updateMaintenanceTicketStatus = async (ticketId, status) => {
    const allowedStatuses = [
        "OPEN",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid maintenance status");
    }

    const ticket = await MaintenanceTicket.findById(ticketId);

    if (!ticket) {
        throw new Error("Maintenance ticket not found");
    }

    ticket.status = status;

    await ticket.save();

    return ticket;
};

const getVisits = async (filters = {}) => {
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.residentId) {
        query.residentId = filters.residentId;
    }

    if (filters.buildingId) {
        query.buildingId = filters.buildingId;
    }

    if (filters.unitId) {
        query.unitId = filters.unitId;
    }

    if (filters.source) {
        query.source = filters.source;
    }

    const visits = await Visit.find(query)
        .populate("residentId", "name email phone unitId")
        .populate("buildingId", "name buildingNumber")
        .populate("unitId", "unitNumber floor type status")
        .populate("securityId", "name email phone role")
        .populate("qrScannedBy", "name email phone role")
        .sort({
            visitDate: -1,
            createdAt: -1,
        });

    return visits;
};

const getVisitById = async (visitId) => {
    const visit = await Visit.findById(visitId)
        .populate("residentId", "name email phone unitId")
        .populate("buildingId", "name buildingNumber description")
        .populate("unitId", "unitNumber floor type status")
        .populate("securityId", "name email phone role")
        .populate("qrScannedBy", "name email phone role");

    if (!visit) {
        throw new Error("Visit not found");
    }

    return visit;
};

const getDashboardOverview = async () => {
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

const getReportsAndAnalytics = async () => {
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
                    count: { $sum: 1 },
                },
            },
        ]),
        User.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]),
        MaintenanceTicket.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]),
        MaintenanceTicket.aggregate([
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 },
                },
            },
        ]),
        Invoice.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
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
                    count: { $sum: 1 },
                },
            },
        ]),
        Unit.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
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
            byStatus: maintenanceByStatus,
            byPriority: maintenanceByPriority,
        },
        invoices: {
            byStatus: invoicesByStatus,
        },
        visits: {
            byStatus: visitsByStatus,
        },
        units: {
            byStatus: unitsByStatus,
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