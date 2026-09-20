const mongoose = require("mongoose");
const Visit = require("../models/visit");
const User = require("../models/user");
const Unit = require("../models/unit");
const Building = require("../models/building");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { sendOtpEmail } = require("./emailService");

const VISITOR_CHAT_DURATION = 24 * 60 * 60 * 1000;

const validateObjectId = (id, fieldName = "ID") => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ${fieldName}`);
    }
};

const validateVisitDateAndTime = (visitDate, visitStartTime) => {
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

    return parsedDate;
};

const generateVisitorChatTokenForVisit = async (visit) => {
    if (!visit) {
        throw new Error("Visit is required");
    }

    if (!visit.residentId) {
        throw new Error("Visitor chat requires a resident-linked visit");
    }

    if (!["APPROVED", "QR_GENERATED", "CHECKED_IN"].includes(visit.status)) {
        throw new Error("Visitor chat is not available for this visit");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    visit.visitorChatTokenHash = tokenHash;
    visit.visitorChatTokenExpiresAt = new Date(Date.now() + VISITOR_CHAT_DURATION);

    await visit.save();

    return {
        token: rawToken,
        expiresAt: visit.visitorChatTokenExpiresAt,
    };
};

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
        throw new Error("Visitor name, email, visit date and start time are required");
    }

    const resident = await User.findOne({
        _id: userId,
        role: "RESIDENT",
        status: "ACTIVE",
    }).select("unitId");

    if (!resident) {
        throw new Error("Resident not found");
    }

    if (!resident.unitId) {
        throw new Error("Resident is not assigned to a unit");
    }

    const unit = await Unit.findById(resident.unitId);

    if (!unit) {
        throw new Error("Resident unit not found");
    }

    const building = await Building.findById(unit.buildingId);

    if (!building) {
        throw new Error("Resident building not found");
    }

    const parsedDate = validateVisitDateAndTime(visitDate, visitStartTime);

    const visit = await Visit.create({
        residentId: userId,
        buildingId: building._id,
        unitId: unit._id,
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
    })
        .populate("buildingId", "name buildingNumber")
        .populate("unitId", "unitNumber floor type")
        .sort({
            visitDate: -1,
            createdAt: -1,
        });

    return visits;
};

const getVisitById = async (userId, visitId) => {
    validateObjectId(visitId, "visit ID");

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
    })
        .populate("buildingId", "name buildingNumber")
        .populate("unitId", "unitNumber floor type");

    if (!visit) {
        throw new Error("Visit not found");
    }

    return visit;
};

const generateVisitOtp = async (userId, visitId) => {
    validateObjectId(visitId, "visit ID");

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
        source: "RESIDENT_INVITE",
    }).select("+otpHash +otpExpiresAt +otpAttempts");

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (visit.status !== "PENDING") {
        throw new Error("OTP can only be generated for pending visits");
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    visit.otpHash = otpHash;
    visit.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
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
    validateObjectId(visitId, "visit ID");

    if (!otp || !/^\d{6}$/.test(otp)) {
        throw new Error("OTP must be a 6-digit number");
    }

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
        source: "RESIDENT_INVITE",
    }).select("+otpHash +otpExpiresAt +otpAttempts");

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (visit.status !== "PENDING") {
        throw new Error("OTP can only be verified for pending visits");
    }

    if (!visit.otpHash || !visit.otpExpiresAt) {
        throw new Error("No OTP has been generated for this visit");
    }

    if (visit.otpAttempts >= 5) {
        throw new Error("Maximum OTP attempts exceeded. Please generate a new OTP");
    }

    if (new Date() > visit.otpExpiresAt) {
        throw new Error("OTP has expired. Please generate a new OTP");
    }

    const isOtpCorrect = await bcrypt.compare(otp, visit.otpHash);

    if (!isOtpCorrect) {
        visit.otpAttempts += 1;
        await visit.save();
        throw new Error("Invalid OTP");
    }

    visit.otpHash = null;
    visit.otpExpiresAt = null;
    visit.otpAttempts = 0;
    visit.status = "APPROVED";

    await visit.save();

    const chatToken = await generateVisitorChatTokenForVisit(visit);

    return {
        visitId: visit._id,
        status: visit.status,
        visitorChatToken: chatToken.token,
        visitorChatTokenExpiresAt: chatToken.expiresAt,
    };
};

const createVisitorRequest = async (visitData) => {
    const {
        visitorName,
        visitorEmail,
        visitorPhone,
        buildingId,
        unitId,
        visitDate,
        visitStartTime,
        purpose,
    } = visitData;

    if (!visitorName || !visitorEmail || !buildingId || !unitId || !visitDate || !visitStartTime) {
        throw new Error("Visitor name, email, building, unit, visit date and start time are required");
    }

    validateObjectId(buildingId, "building ID");
    validateObjectId(unitId, "unit ID");

    const building = await Building.findById(buildingId);

    if (!building) {
        throw new Error("Building not found");
    }

    const unit = await Unit.findOne({
        _id: unitId,
        buildingId,
    });

    if (!unit) {
        throw new Error("Unit does not belong to the selected building");
    }

    if (unit.status !== "OCCUPIED") {
        throw new Error("Visitor requests can only be sent to occupied units");
    }

    const resident = await User.findOne({
        unitId: unit._id,
        role: "RESIDENT",
        status: "ACTIVE",
    }).select("_id");

    if (!resident) {
        throw new Error("No active resident is assigned to this unit");
    }

    const parsedDate = validateVisitDateAndTime(visitDate, visitStartTime);

    const visit = await Visit.create({
        residentId: null,
        buildingId: building._id,
        unitId: unit._id,
        visitorName,
        visitorEmail,
        visitorPhone: visitorPhone || null,
        source: "VISITOR_REQUEST",
        status: "PENDING",
        visitDate: parsedDate,
        visitStartTime,
        purpose: purpose || null,
    });

    return {
        visitId: visit._id,
        status: visit.status,
        message: "Visitor request created. OTP is required.",
    };
};

const generateVisitorRequestOtp = async (visitId) => {
    validateObjectId(visitId, "visitor request ID");

    const visit = await Visit.findOne({
        _id: visitId,
        source: "VISITOR_REQUEST",
    }).select("+otpHash +otpExpiresAt +otpAttempts");

    if (!visit) {
        throw new Error("Visitor request not found");
    }

    if (visit.status !== "PENDING") {
        throw new Error("OTP can only be generated for pending visitor requests");
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    visit.otpHash = otpHash;
    visit.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
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

const verifyVisitorRequestOtp = async (visitId, otp) => {
    validateObjectId(visitId, "visitor request ID");

    if (!otp || !/^\d{6}$/.test(otp)) {
        throw new Error("OTP must be a 6-digit number");
    }

    const visit = await Visit.findOne({
        _id: visitId,
        source: "VISITOR_REQUEST",
    }).select("+otpHash +otpExpiresAt +otpAttempts");

    if (!visit) {
        throw new Error("Visitor request not found");
    }

    if (visit.status !== "PENDING") {
        throw new Error("OTP can only be verified for pending visitor requests");
    }

    if (!visit.otpHash || !visit.otpExpiresAt) {
        throw new Error("No OTP has been generated for this visitor request");
    }

    if (visit.otpAttempts >= 5) {
        throw new Error("Maximum OTP attempts exceeded. Please generate a new OTP");
    }

    if (new Date() > visit.otpExpiresAt) {
        throw new Error("OTP has expired. Please generate a new OTP");
    }

    const isOtpCorrect = await bcrypt.compare(otp, visit.otpHash);

    if (!isOtpCorrect) {
        visit.otpAttempts += 1;
        await visit.save();
        throw new Error("Invalid OTP");
    }

    const resident = await User.findOne({
        unitId: visit.unitId,
        role: "RESIDENT",
        status: "ACTIVE",
    }).select("_id");

    if (!resident) {
        throw new Error("No active resident is assigned to this unit");
    }

    visit.residentId = resident._id;
    visit.otpHash = null;
    visit.otpExpiresAt = null;
    visit.otpAttempts = 0;
    visit.status = "PENDING";

    await visit.save();

    return {
        visitId: visit._id,
        status: visit.status,
        residentId: visit.residentId,
        message: "OTP verified. Waiting for resident approval.",
    };
};

const getResidentVisitorRequests = async (residentId) => {
    const visits = await Visit.find({
        residentId,
        source: "VISITOR_REQUEST",
    })
        .populate("buildingId", "name buildingNumber")
        .populate("unitId", "unitNumber floor type")
        .sort({
            createdAt: -1,
        });

    return visits;
};

const approveVisitorRequest = async (residentId, visitId) => {
    validateObjectId(visitId, "visitor request ID");

    const visit = await Visit.findOne({
        _id: visitId,
        residentId,
        source: "VISITOR_REQUEST",
    });

    if (!visit) {
        throw new Error("Visitor request not found");
    }

    if (visit.status !== "PENDING") {
        throw new Error("Only pending visitor requests can be approved");
    }

    visit.status = "APPROVED";
    visit.approvedAt = new Date();

    await visit.save();

    const chatToken = await generateVisitorChatTokenForVisit(visit);

    return {
        visitId: visit._id,
        status: visit.status,
        approvedAt: visit.approvedAt,
        visitorChatToken: chatToken.token,
        visitorChatTokenExpiresAt: chatToken.expiresAt,
    };
};

const rejectVisitorRequest = async (residentId, visitId) => {
    validateObjectId(visitId, "visitor request ID");

    const visit = await Visit.findOne({
        _id: visitId,
        residentId,
        source: "VISITOR_REQUEST",
    });

    if (!visit) {
        throw new Error("Visitor request not found");
    }

    if (visit.status !== "PENDING") {
        throw new Error("Only pending visitor requests can be rejected");
    }

    visit.status = "REJECTED";

    await visit.save();

    return {
        visitId: visit._id,
        status: visit.status,
    };
};

const generateVisitQr = async (userId, visitId) => {
    validateObjectId(visitId, "visit ID");

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
    }).select("+qrTokenHash");

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (visit.status !== "QR_GENERATED" && visit.status !== "APPROVED") {
        throw new Error("QR can only be generated after OTP verification");
    }

    const qrToken = crypto.randomBytes(32).toString("hex");
    const qrTokenHash = await bcrypt.hash(qrToken, 10);

    visit.qrTokenHash = qrTokenHash;
    visit.qrExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    visit.status = "QR_GENERATED";

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
        qrExpiresAt: {
            $gt: new Date(),
        },
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
        throw new Error("QR has already been scanned by another security officer");
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
    validateObjectId(visitId, "visit ID");

    const visit = await Visit.findById(visitId);

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (visit.status !== "QR_GENERATED") {
        throw new Error("Only visitors with a valid QR can be checked in");
    }

    if (!visit.qrExpiresAt || new Date() > visit.qrExpiresAt) {
        throw new Error("QR has expired");
    }

    if (!visit.qrScannedAt || !visit.qrScannedBy) {
        throw new Error("QR must be scanned before check-in");
    }

    if (visit.qrScannedBy.toString() !== securityId.toString()) {
        throw new Error("QR was scanned by another security officer");
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
    validateObjectId(visitId, "visit ID");

    const visit = await Visit.findById(visitId);

    if (!visit) {
        throw new Error("Visit not found");
    }

    if (visit.status !== "CHECKED_IN") {
        throw new Error("Only checked-in visitors can be checked out");
    }

    if (!visit.securityId) {
        throw new Error("No security officer is assigned to this visit");
    }

    if (visit.securityId.toString() !== securityId.toString()) {
        throw new Error("Visitor must be checked out by the same security officer");
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

const getSecurityVisits = async () => {
    const visits = await Visit.find({})
        .populate("residentId", "name email phone")
        .populate("buildingId", "name buildingNumber")
        .populate("unitId", "unitNumber floor type")
        .populate("securityId", "name email")
        .sort({
            visitDate: -1,
            visitStartTime: -1,
        });

    return visits;
};

const getSecurityVisitById = async (visitId) => {
    validateObjectId(visitId, "visit ID");

    const visit = await Visit.findById(visitId)
        .populate("residentId", "name email phone")
        .populate("buildingId", "name buildingNumber")
        .populate("unitId", "unitNumber floor type")
        .populate("securityId", "name email");

    if (!visit) {
        throw new Error("Visit not found");
    }

    return visit;
};

module.exports = {
    createVisit,
    getMyVisits,
    getVisitById,
    generateVisitOtp,
    verifyVisitOtp,
    createVisitorRequest,
    generateVisitorRequestOtp,
    verifyVisitorRequestOtp,
    getResidentVisitorRequests,
    approveVisitorRequest,
    rejectVisitorRequest,
    generateVisitQr,
    scanVisitQr,
    checkInVisit,
    checkOutVisit,
    getSecurityVisits,
    getSecurityVisitById,
    generateVisitorChatTokenForVisit,
};
