const adminService = require("../services/adminService");
const visitService = require("../services/visitService");

const getUsers = async (req, res) => {
    try {
        const users = await adminService.getAllUsers(
            req.query
        );

        res.status(200).json({
            success: true,
            count: users.length,
            data: users,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await adminService.getUserById(
            req.params.userId
        );

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

const approveUser = async (req, res) => {
    try {
        const user = await adminService.approveUser(
            req.params.userId
        );

        res.status(200).json({
            success: true,
            message: "User approved successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const rejectUser = async (req, res) => {
    try {
        const user = await adminService.rejectUser(
            req.params.userId
        );

        res.status(200).json({
            success: true,
            message: "User rejected successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getBuildings = async (req, res) => {
    try {
        const buildings =
            await adminService.getBuildings();

        res.status(200).json({
            success: true,
            count: buildings.length,
            data: buildings,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const createBuilding = async (req, res) => {
    try {
        const building =
            await adminService.createBuilding(req.body);

        res.status(201).json({
            success: true,
            message: "Building created successfully",
            data: building,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const updateBuilding = async (req, res) => {
    try {
        const building =
            await adminService.updateBuilding(
                req.params.buildingId,
                req.body
            );

        res.status(200).json({
            success: true,
            message: "Building updated successfully",
            data: building,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getUnits = async (req, res) => {
    try {
        const units = await adminService.getUnits(
            req.query
        );

        res.status(200).json({
            success: true,
            count: units.length,
            data: units,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const createUnit = async (req, res) => {
    try {
        const unit =
            await adminService.createUnit(req.body);

        res.status(201).json({
            success: true,
            message: "Unit created successfully",
            data: unit,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const updateUnit = async (req, res) => {
    try {
        const unit =
            await adminService.updateUnit(
                req.params.unitId,
                req.body
            );

        res.status(200).json({
            success: true,
            message: "Unit updated successfully",
            data: unit,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getInvoices = async (req, res) => {
    try {
        const invoices =
            await adminService.getInvoices(req.query);

        res.status(200).json({
            success: true,
            count: invoices.length,
            data: invoices,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const createInvoice = async (req, res) => {
    try {
        const invoice =
            await adminService.createInvoice(req.body);

        res.status(201).json({
            success: true,
            message: "Invoice created successfully",
            data: invoice,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const updateInvoiceStatus = async (req, res) => {
    try {
        const invoice =
            await adminService.updateInvoiceStatus(
                req.params.invoiceId,
                req.body.status
            );

        res.status(200).json({
            success: true,
            message: "Invoice status updated successfully",
            data: invoice,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getMaintenanceTickets = async (req, res) => {
    try {
        const tickets =
            await adminService.getMaintenanceTickets(
                req.query
            );

        res.status(200).json({
            success: true,
            count: tickets.length,
            data: tickets,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getMaintenanceTicketById = async (req, res) => {
    try {
        const ticket =
            await adminService.getMaintenanceTicketById(
                req.params.ticketId
            );

        res.status(200).json({
            success: true,
            data: ticket,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

const updateMaintenanceTicketStatus = async (
    req,
    res
) => {
    try {
        const ticket =
            await adminService.updateMaintenanceTicketStatus(
                req.params.ticketId,
                req.body.status
            );

        res.status(200).json({
            success: true,
            message:
                "Maintenance ticket status updated successfully",
            data: ticket,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getVisits = async (req, res) => {
    try {
        const visits =
            await adminService.getVisits(req.query);

        res.status(200).json({
            success: true,
            count: visits.length,
            data: visits,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getVisitById = async (req, res) => {
    try {
        const visit =
            await adminService.getVisitById(
                req.params.visitId
            );

        res.status(200).json({
            success: true,
            data: visit,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

const getDashboard = async (req, res) => {
    try {
        const dashboard =
            await adminService.getDashboardOverview();

        res.status(200).json({
            success: true,
            data: dashboard,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getReports = async (req, res) => {
    try {
        const reports =
            await adminService.getReportsAndAnalytics();

        res.status(200).json({
            success: true,
            data: reports,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const expireStaleVisits = async (req, res) => {
    try {
        const result =
            await visitService.expireStaleVisits();

        res.status(200).json({
            success: true,
            message:
                "Stale visits expired successfully",
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


module.exports = {
    getUsers,
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
    getDashboard,
    getReports,
    expireStaleVisits,
};