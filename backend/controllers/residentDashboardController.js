const dashboardService = require("../services/residentDashboardService");
const invoiceService = require("../services/invoiceService");

const getResidentDashboard = async (req, res) => {
    try {
        const dashboard = await dashboardService.getResidentDashboard(
            req.user.userId
        );

        res.status(200).json({
            success: true,
            data: dashboard,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message:
                error.message ||
                "Failed to load dashboard data",
        });
    }
};

/**
 * Resident claims a payment on one of their own invoices.
 *
 * Moves PENDING / OVERDUE -> PAYMENT_SUBMITTED; only an admin can confirm it
 * as PAID (see adminService.updateInvoiceStatus).
 */
const payInvoice = async (req, res) => {
    try {
        const invoice = await invoiceService.submitInvoicePayment(
            req.user.userId,
            req.params.invoiceId,
            req.body?.reference
        );

        res.status(200).json({
            success: true,
            message:
                "Payment submitted. An admin will confirm it shortly.",
            data: invoice,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to submit payment",
        });
    }
};

module.exports = {
    getResidentDashboard,
    payInvoice,
};