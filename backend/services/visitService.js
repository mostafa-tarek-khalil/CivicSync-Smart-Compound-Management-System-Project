const mongoose = require("mongoose");
const Visit = require("../models/visit");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { sendOtpEmail } = require("./emailService");

const createVisit = async (userId, visitData) => {
    const {
        visitorName,
        visitorEmail,
        visitorPhone,
        visitDate,
        visitStartTime,
        purpose,
    } = visitData;

    if (!visitorName || !visitorEmail || !visitDate || !visitStartTime) {
        throw new Error(
            "Visitor name, email, visit date and start time are required"
        );
    }

    const parsedDate = new Date(visitDate);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Invalid visit date");
    }

    parsedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (parsedDate < today) {
        throw new Error("Visit date cannot be in the past");
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(visitStartTime)) {
        throw new Error("Visit start time must be in HH:mm format");
    }

    const visit = await Visit.create({
        residentId: userId,
        visitorName,
        visitorEmail,
        visitorPhone: visitorPhone || null,
        source: "RESIDENT_INVITE",
        status: "PENDING",
        visitDate: parsedDate,
        visitStartTime,
        purpose: purpose || null,
    });

    return visit;
};

const getMyVisits = async (userId) => {
    const visits = await Visit.find({
        residentId: userId,
    }).sort({
        visitDate: -1,
        createdAt: -1,
    });

    return visits;
};

const getVisitById = async (userId, visitId) => {
    if (!mongoose.Types.ObjectId.isValid(visitId)) {
        throw new Error("Invalid visit ID");
    }

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
    });

    if (!visit) {
        throw new Error("Visit not found");
    }

    return visit;
};

const generateVisitOtp = async (userId, visitId) => {
    if (!mongoose.Types.ObjectId.isValid(visitId)) {
        throw new Error("Invalid visit ID");
    }

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
    }).select("+otpHash +otpExpiresAt +otpAttempts");

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (visit.status !== "PENDING") {
        throw new Error(
            "OTP can only be generated for pending visits"
        );
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    const otpHash = await bcrypt.hash(otp, 10);

    visit.otpHash = otpHash;

    visit.otpExpiresAt = new Date(
        Date.now() + 5 * 60 * 1000
    );

    visit.otpAttempts = 0;

    await visit.save();

    await sendOtpEmail(
        visit.visitorEmail,
        otp,
        visit.visitorName
    );

    return {
        visitId: visit._id,
        expiresAt: visit.otpExpiresAt,
    };
};

const verifyVisitOtp = async (userId, visitId, otp) => {
    if (!mongoose.Types.ObjectId.isValid(visitId)) {
        throw new Error("Invalid visit ID");
    }

    if (!otp || !/^\d{6}$/.test(otp)) {
        throw new Error("OTP must be a 6-digit number");
    }

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
    }).select("+otpHash +otpExpiresAt +otpAttempts");

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (visit.status !== "PENDING") {
        throw new Error(
            "OTP can only be verified for pending visits"
        );
    }

    if (!visit.otpHash || !visit.otpExpiresAt) {
        throw new Error("No OTP has been generated for this visit");
    }

    if (visit.otpAttempts >= 5) {
        throw new Error(
            "Maximum OTP attempts exceeded. Please generate a new OTP"
        );
    }

    if (new Date() > visit.otpExpiresAt) {
        throw new Error(
            "OTP has expired. Please generate a new OTP"
        );
    }

    const isOtpCorrect = await bcrypt.compare(
        otp,
        visit.otpHash
    );

    if (!isOtpCorrect) {
        visit.otpAttempts += 1;
        await visit.save();

        throw new Error("Invalid OTP");
    }

    visit.otpHash = null;
    visit.otpExpiresAt = null;
    visit.otpAttempts = 0;

    visit.status = "QR_GENERATED";

    await visit.save();

    return {
        visitId: visit._id,
        status: visit.status,
    };
};

const generateVisitQr = async (userId, visitId) => {
    if (!mongoose.Types.ObjectId.isValid(visitId)) {
        throw new Error("Invalid visit ID");
    }

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
    }).select("+qrTokenHash");

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (visit.status !== "QR_GENERATED") {
        throw new Error(
            "QR can only be generated after OTP verification"
        );
    }

    const qrToken = crypto.randomBytes(32).toString("hex");

    const qrTokenHash = await bcrypt.hash(qrToken, 10);

    visit.qrTokenHash = qrTokenHash;

    visit.qrExpiresAt = new Date(
        Date.now() + 30 * 60 * 1000
    );

    await visit.save();

    return {
        visitId: visit._id,
        qrToken,
        expiresAt: visit.qrExpiresAt,
    };
};

const scanVisitQr = async (securityId, qrToken) => {
    if (!qrToken) {
        throw new Error("QR token is required");
    }

    const visits = await Visit.find({
        status: "QR_GENERATED",
        qrExpiresAt: { $gt: new Date() },
    }).select("+qrTokenHash");

    let matchedVisit = null;

    for (const visit of visits) {
        if (!visit.qrTokenHash) {
            continue;
        }

        const isValidToken = await bcrypt.compare(
            qrToken,
            visit.qrTokenHash
        );

        if (isValidToken) {
            matchedVisit = visit;
            break;
        }
    }

    if (!matchedVisit) {
        throw new Error("Invalid or expired QR");
    }

    if (matchedVisit.qrScannedBy) {
        throw new Error(
            "QR has already been scanned by another security officer"
        );
    }

    matchedVisit.qrScannedAt = new Date();
    matchedVisit.qrScannedBy = securityId;

    await matchedVisit.save();

    return {
        visitId: matchedVisit._id,
        visitorName: matchedVisit.visitorName,
        visitorEmail: matchedVisit.visitorEmail,
        visitorPhone: matchedVisit.visitorPhone,
        visitDate: matchedVisit.visitDate,
        visitStartTime: matchedVisit.visitStartTime,
        purpose: matchedVisit.purpose,
        status: matchedVisit.status,
        qrExpiresAt: matchedVisit.qrExpiresAt,
    };
};

const checkInVisit = async (securityId, visitId) => {
    if (!mongoose.Types.ObjectId.isValid(visitId)) {
        throw new Error("Invalid visit ID");
    }

    const visit = await Visit.findById(visitId);

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (visit.status !== "QR_GENERATED") {
        throw new Error(
            "Only visitors with a valid QR can be checked in"
        );
    }

    if (
        !visit.qrExpiresAt ||
        new Date() > visit.qrExpiresAt
    ) {
        throw new Error("QR has expired");
    }

    if (!visit.qrScannedAt || !visit.qrScannedBy) {
        throw new Error(
            "QR must be scanned before check-in"
        );
    }

    if (visit.qrScannedBy.toString() !== securityId.toString()) {
        throw new Error(
            "QR was scanned by another security officer"
        );
    }

    visit.status = "CHECKED_IN";
    visit.checkedInAt = new Date();
    visit.securityId = securityId;

    await visit.save();

    return {
        visitId: visit._id,
        visitorName: visit.visitorName,
        visitorEmail: visit.visitorEmail,
        visitorPhone: visit.visitorPhone,
        status: visit.status,
        checkedInAt: visit.checkedInAt,
        securityId: visit.securityId,
    };
};

const checkOutVisit = async (securityId, visitId) => {
    if (!mongoose.Types.ObjectId.isValid(visitId)) {
        throw new Error("Invalid visit ID");
    }

    const visit = await Visit.findById(visitId);

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (visit.status !== "CHECKED_IN") {
        throw new Error(
            "Only checked-in visitors can be checked out"
        );
    }

    if (!visit.securityId) {
        throw new Error(
            "No security officer is assigned to this visit"
        );
    }

    if (visit.securityId.toString() !== securityId.toString()) {
        throw new Error(
            "Visitor must be checked out by the same security officer"
        );
    }

    visit.status = "CHECKED_OUT";
    visit.checkedOutAt = new Date();

    await visit.save();

    return {
        visitId: visit._id,
        visitorName: visit.visitorName,
        visitorEmail: visit.visitorEmail,
        visitorPhone: visit.visitorPhone,
        status: visit.status,
        checkedInAt: visit.checkedInAt,
        checkedOutAt: visit.checkedOutAt,
        securityId: visit.securityId,
    };
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