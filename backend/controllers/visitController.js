const visitService = require("../services/visitService");

const createVisit = async (req, res) => {
    try {
        const visit = await visitService.createVisit(
            req.user.userId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Visit created successfully",
            data: visit,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getMyVisits = async (req, res) => {
    try {
        const visits = await visitService.getMyVisits(
            req.user.userId
        );

        return res.status(200).json({
            success: true,
            message: "Visits retrieved successfully",
            data: visits,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const getVisitById = async (req, res) => {
    try {
        const visit = await visitService.getVisitById(
            req.user.userId,
            req.params.id
        );

        return res.status(200).json({
            success: true,
            message: "Visit retrieved successfully",
            data: visit,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const generateVisitOtp = async (req, res) => {
    try {
        const result = await visitService.generateVisitOtp(
            req.user.userId,
            req.params.id
        );

        return res.status(200).json({
            success: true,
            message: "OTP generated successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const verifyVisitOtp = async (req, res) => {
    try {
        const result = await visitService.verifyVisitOtp(
            req.user.userId,
            req.params.id,
            req.body.otp
        );

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const generateVisitQr = async (req, res) => {
    try {
        const result = await visitService.generateVisitQr(
            req.user.userId,
            req.params.id
        );

        return res.status(200).json({
            success: true,
            message: "QR generated successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const scanVisitQr = async (req, res) => {
    try {
        const result = await visitService.scanVisitQr(
            req.user.userId,
            req.body.qrToken
        );

        return res.status(200).json({
            success: true,
            message: "QR scanned successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const checkInVisit = async (req, res) => {
    try {
        const result = await visitService.checkInVisit(
            req.user.userId,
            req.params.id
        );

        return res.status(200).json({
            success: true,
            message: "Visitor checked in successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

const checkOutVisit = async (req, res) => {
    try {
        const result = await visitService.checkOutVisit(
            req.user.userId,
            req.params.id
        );

        return res.status(200).json({
            success: true,
            message: "Visitor checked out successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    createVisit,
    getMyVisits,
    getVisitById,
    generateVisitOtp,
    verifyVisitOtp,
    generateVisitQr,
    scanVisitQr,
    checkInVisit,
    checkOutVisit,
};