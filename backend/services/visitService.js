const mongoose = require("mongoose");
const Visit = require("../models/visit");
const User = require("../models/user");
const Unit = require("../models/unit");
const Building = require("../models/building");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { sendOtpEmail } = require("./emailService");
const { createNotification, notifyRole } = require("./notificationService");

const VISITOR_CHAT_DURATION = 24 * 60 * 60 * 1000;
const OTP_DURATION = 5 * 60 * 1000;
const QR_DURATION = 30 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const validateObjectId = (id, fieldName = "ID") => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error(`Invalid ${fieldName}`);
        error.statusCode = 400;
        throw error;
    }
};

const validateVisitDateAndTime = (
    visitDate,
    visitStartTime
) => {
    const parsedDate = new Date(visitDate);

    if (Number.isNaN(parsedDate.getTime())) {
        const error = new Error("Invalid visit date");
        error.statusCode = 400;
        throw error;
    }

    parsedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (parsedDate < today) {
        const error = new Error(
            "Visit date cannot be in the past"
        );
        error.statusCode = 400;
        throw error;
    }

    const timeRegex =
        /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(visitStartTime)) {
        const error = new Error(
            "Visit start time must be in HH:mm format"
        );
        error.statusCode = 400;
        throw error;
    }

    return parsedDate;
};

const generateVisitorChatTokenForVisit = async (
    visit
) => {
    if (!visit) {
        const error = new Error("Visit is required");
        error.statusCode = 400;
        throw error;
    }

    if (!visit.residentId) {
        const error = new Error(
            "Visitor chat requires a resident-linked visit"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        ![
            "APPROVED",
            "QR_GENERATED",
            "CHECKED_IN",
        ].includes(visit.status)
    ) {
        const error = new Error(
            "Visitor chat is not available for this visit"
        );
        error.statusCode = 400;
        throw error;
    }

    const rawToken = crypto
        .randomBytes(32)
        .toString("hex");

    const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    visit.visitorChatTokenHash = tokenHash;

    visit.visitorChatTokenExpiresAt =
        new Date(
            Date.now() + VISITOR_CHAT_DURATION
        );

    await visit.save();

    return {
        token: rawToken,
        expiresAt:
            visit.visitorChatTokenExpiresAt,
    };
};

const createVisit = async (
    userId,
    visitData
) => {
    const {
        visitorName,
        visitorEmail,
        visitorPhone,
        visitDate,
        visitStartTime,
        purpose,
    } = visitData;

    if (
        !visitorName ||
        !visitorEmail ||
        !visitDate ||
        !visitStartTime
    ) {
        const error = new Error(
            "Visitor name, email, visit date and start time are required"
        );
        error.statusCode = 400;
        throw error;
    }

    const resident = await User.findOne({
        _id: userId,
        role: "RESIDENT",
        status: "ACTIVE",
    }).select("unitId");

    if (!resident) {
        const error = new Error(
            "Resident not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (!resident.unitId) {
        const error = new Error(
            "Resident is not assigned to a unit"
        );
        error.statusCode = 400;
        throw error;
    }

    const unit = await Unit.findById(
        resident.unitId
    );

    if (!unit) {
        const error = new Error(
            "Resident unit not found"
        );
        error.statusCode = 404;
        throw error;
    }

    const building = await Building.findById(
        unit.buildingId
    );

    if (!building) {
        const error = new Error(
            "Resident building not found"
        );
        error.statusCode = 404;
        throw error;
    }

    const parsedDate =
        validateVisitDateAndTime(
            visitDate,
            visitStartTime
        );

    const visit = await Visit.create({
        residentId: userId,
        buildingId: building._id,
        unitId: unit._id,
        visitorName,
        visitorEmail,
        visitorPhone:
            visitorPhone || null,
        source: "RESIDENT_INVITE",
        status: "PENDING",
        visitDate: parsedDate,
        visitStartTime,
        purpose: purpose || null,
    });

    return visit;
};

const getMyVisits = async (userId) => {
    await expireStaleVisits();

    return await Visit.find({
        residentId: userId,
    })
        .populate(
            "buildingId",
            "name buildingNumber"
        )
        .populate(
            "unitId",
            "unitNumber floor type"
        )
        .sort({
            visitDate: -1,
            createdAt: -1,
        });
};

const getVisitById = async (
    userId,
    visitId
) => {
    validateObjectId(visitId, "visit ID");

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
    })
        .populate(
            "buildingId",
            "name buildingNumber"
        )
        .populate(
            "unitId",
            "unitNumber floor type"
        );

    if (!visit) {
        const error = new Error(
            "Visit not found"
        );
        error.statusCode = 404;
        throw error;
    }

    return visit;
};

const generateVisitOtp = async (
    userId,
    visitId
) => {
    validateObjectId(visitId, "visit ID");

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
        source: "RESIDENT_INVITE",
    }).select(
        "+otpHash +otpExpiresAt +otpAttempts"
    );

    if (!visit) {
        const error = new Error(
            "Visit not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (visit.status !== "PENDING") {
        const error = new Error(
            "OTP can only be generated for pending visits"
        );
        error.statusCode = 400;
        throw error;
    }

    const otp = crypto
        .randomInt(100000, 1000000)
        .toString();

    const otpHash = await bcrypt.hash(
        otp,
        10
    );

    visit.otpHash = otpHash;

    visit.otpExpiresAt =
        new Date(Date.now() + OTP_DURATION);

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

const verifyVisitOtp = async (
    userId,
    visitId,
    otp
) => {
    validateObjectId(visitId, "visit ID");

    if (!otp || !/^\d{6}$/.test(otp)) {
        const error = new Error(
            "OTP must be a 6-digit number"
        );
        error.statusCode = 400;
        throw error;
    }

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
        source: "RESIDENT_INVITE",
    }).select(
        "+otpHash +otpExpiresAt +otpAttempts"
    );

    if (!visit) {
        const error = new Error(
            "Visit not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (visit.status !== "PENDING") {
        const error = new Error(
            "OTP can only be verified for pending visits"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        !visit.otpHash ||
        !visit.otpExpiresAt
    ) {
        const error = new Error(
            "No OTP has been generated for this visit"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        visit.otpAttempts >=
        MAX_OTP_ATTEMPTS
    ) {
        const error = new Error(
            "Maximum OTP attempts exceeded. Please generate a new OTP"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        new Date() >
        visit.otpExpiresAt
    ) {
        const error = new Error(
            "OTP has expired. Please generate a new OTP"
        );
        error.statusCode = 400;
        throw error;
    }

    const isOtpCorrect =
        await bcrypt.compare(
            otp,
            visit.otpHash
        );

    if (!isOtpCorrect) {
        const updatedVisit =
            await Visit.findOneAndUpdate(
                {
                    _id: visitId,
                    residentId: userId,
                    status: "PENDING",
                    otpAttempts: {
                        $lt: MAX_OTP_ATTEMPTS,
                    },
                },
                {
                    $inc: {
                        otpAttempts: 1,
                    },
                },
                {
                    new: true,
                }
            );

        if (!updatedVisit) {
            const error = new Error(
                "Maximum OTP attempts exceeded. Please generate a new OTP"
            );
            error.statusCode = 400;
            throw error;
        }

        const error = new Error(
            "Invalid OTP"
        );
        error.statusCode = 400;
        throw error;
    }

    const approvedAt = new Date();

    const updatedVisit =
        await Visit.findOneAndUpdate(
            {
                _id: visitId,
                residentId: userId,
                status: "PENDING",
                otpHash: visit.otpHash,
                otpExpiresAt: {
                    $gte: new Date(),
                },
            },
            {
                $set: {
                    otpHash: null,
                    otpExpiresAt: null,
                    otpAttempts: 0,
                    status: "APPROVED",
                    approvedAt,
                },
            },
            {
                new: true,
            }
        );

    if (!updatedVisit) {
        const error = new Error(
            "OTP verification failed or the visit has already been processed"
        );
        error.statusCode = 400;
        throw error;
    }

    const chatToken =
        await generateVisitorChatTokenForVisit(
            updatedVisit
        );

    // Keep the state machine consistent with check-in:
    // once the OTP is verified, immediately generate the QR so the
    // visit reaches the QR_GENERATED state required by check-in.
    const qr = await generateVisitQr(
        userId,
        updatedVisit._id
    );

    return {
        visitId: updatedVisit._id,
        status: "QR_GENERATED",
        approvedAt:
            updatedVisit.approvedAt,
        visitorChatToken:
            chatToken.token,
        visitorChatTokenExpiresAt:
            chatToken.expiresAt,
        qrToken: qr.qrToken,
        qrExpiresAt: qr.expiresAt,
    };
};

const createVisitorRequest = async (
    visitData
) => {
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

    if (
        !visitorName ||
        !visitorEmail ||
        !buildingId ||
        !unitId ||
        !visitDate ||
        !visitStartTime
    ) {
        const error = new Error(
            "Visitor name, email, building, unit, visit date and start time are required"
        );
        error.statusCode = 400;
        throw error;
    }

    validateObjectId(
        buildingId,
        "building ID"
    );

    validateObjectId(
        unitId,
        "unit ID"
    );

    const building =
        await Building.findById(
            buildingId
        );

    if (!building) {
        const error = new Error(
            "Building not found"
        );
        error.statusCode = 404;
        throw error;
    }

    const unit = await Unit.findOne({
        _id: unitId,
        buildingId,
    });

    if (!unit) {
        const error = new Error(
            "Unit does not belong to the selected building"
        );
        error.statusCode = 400;
        throw error;
    }

    if (unit.status !== "OCCUPIED") {
        const error = new Error(
            "Visitor requests can only be sent to occupied units"
        );
        error.statusCode = 400;
        throw error;
    }

    const resident =
        await User.findOne({
            unitId: unit._id,
            role: "RESIDENT",
            status: "ACTIVE",
        }).select("_id");

    if (!resident) {
        const error = new Error(
            "No active resident is assigned to this unit"
        );
        error.statusCode = 404;
        throw error;
    }

    const parsedDate =
        validateVisitDateAndTime(
            visitDate,
            visitStartTime
        );

    const visit = await Visit.create({
        residentId: resident._id,
        buildingId: building._id,
        unitId: unit._id,
        visitorName,
        visitorEmail,
        visitorPhone:
            visitorPhone || null,
        source: "VISITOR_REQUEST",
        status: "PENDING",
        visitDate: parsedDate,
        visitStartTime,
        purpose: purpose || null,
    });

    await createNotification({
        userId: resident._id,
        type: "VISITOR_REQUEST",
        title: "Visitor request",
        message: `${visit.visitorName} requested to visit your unit.`,
        relatedId: visit._id,
    });

    return {
        visitId: visit._id,
        status: visit.status,
        message:
            "Visitor request created. OTP is required.",
    };
};

const getVisitorUnits = async () => {
    const residents = await User.find({
        role: "RESIDENT",
        status: "ACTIVE",
        unitId: { $ne: null },
    }).select("unitId");
    const residentUnitIds = residents.map((resident) => resident.unitId);

    return Unit.find({
        status: "OCCUPIED",
        _id: { $in: residentUnitIds },
    })
        .populate("buildingId", "name buildingNumber")
        .sort({ buildingId: 1, floor: 1, unitNumber: 1 });
};

const getVisitorRequestStatus = async (visitId, visitorEmail) => {
    validateObjectId(visitId, "visitor request ID");
    if (!visitorEmail || typeof visitorEmail !== "string") {
        const error = new Error("Visitor email is required");
        error.statusCode = 400;
        throw error;
    }

    const visit = await Visit.findOne({
        _id: visitId,
        source: "VISITOR_REQUEST",
        visitorEmail: visitorEmail.trim().toLowerCase(),
    })
        .populate("residentId", "name")
        .populate("buildingId", "name buildingNumber")
        .populate("unitId", "unitNumber floor");

    if (!visit) {
        const error = new Error("Visitor request not found");
        error.statusCode = 404;
        throw error;
    }

    return visit;
};

/**
 * Let a visitor recover their own requests using only their email address.
 * Returns the most recent requests so a visitor can resume tracking a visit
 * even after closing the browser or switching devices.
 */
const lookupVisitorRequests = async (visitorEmail) => {
    if (!visitorEmail || typeof visitorEmail !== "string") {
        const error = new Error("Visitor email is required");
        error.statusCode = 400;
        throw error;
    }

    const normalizedEmail = visitorEmail.trim().toLowerCase();

    return await Visit.find({
        source: "VISITOR_REQUEST",
        visitorEmail: normalizedEmail,
    })
        .populate("residentId", "name")
        .populate("buildingId", "name buildingNumber")
        .populate("unitId", "unitNumber floor type")
        .sort({ createdAt: -1 })
        .limit(25);
};

const generateVisitorRequestQr = async (visitId, visitorEmail) => {
    const visit = await getVisitorRequestStatus(visitId, visitorEmail);
    if (visit.status !== "QR_GENERATED") {
        const error = new Error("QR is available only after resident approval");
        error.statusCode = 400;
        throw error;
    }

    return generateVisitQr(visit.residentId._id, visit._id);
};

const generateVisitorRequestOtp = async (
    visitId
) => {
    validateObjectId(
        visitId,
        "visitor request ID"
    );

    const visit = await Visit.findOne({
        _id: visitId,
        source: "VISITOR_REQUEST",
    }).select(
        "+otpHash +otpExpiresAt +otpAttempts"
    );

    if (!visit) {
        const error = new Error(
            "Visitor request not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (visit.status !== "PENDING") {
        const error = new Error(
            "OTP can only be generated for pending visitor requests"
        );
        error.statusCode = 400;
        throw error;
    }

    const otp = crypto
        .randomInt(100000, 1000000)
        .toString();

    const otpHash = await bcrypt.hash(
        otp,
        10
    );

    visit.otpHash = otpHash;

    visit.otpExpiresAt =
        new Date(Date.now() + OTP_DURATION);

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

const verifyVisitorRequestOtp = async (
    visitId,
    otp
) => {
    validateObjectId(
        visitId,
        "visitor request ID"
    );

    if (!otp || !/^\d{6}$/.test(otp)) {
        const error = new Error(
            "OTP must be a 6-digit number"
        );
        error.statusCode = 400;
        throw error;
    }

    const visit = await Visit.findOne({
        _id: visitId,
        source: "VISITOR_REQUEST",
    }).select(
        "+otpHash +otpExpiresAt +otpAttempts"
    );

    if (!visit) {
        const error = new Error(
            "Visitor request not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (visit.status !== "PENDING") {
        const error = new Error(
            "OTP can only be verified for pending visitor requests"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        !visit.otpHash ||
        !visit.otpExpiresAt
    ) {
        const error = new Error(
            "No OTP has been generated for this visitor request"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        visit.otpAttempts >=
        MAX_OTP_ATTEMPTS
    ) {
        const error = new Error(
            "Maximum OTP attempts exceeded. Please generate a new OTP"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        new Date() >
        visit.otpExpiresAt
    ) {
        const error = new Error(
            "OTP has expired. Please generate a new OTP"
        );
        error.statusCode = 400;
        throw error;
    }

    const isOtpCorrect =
        await bcrypt.compare(
            otp,
            visit.otpHash
        );

    if (!isOtpCorrect) {
        const updatedVisit =
            await Visit.findOneAndUpdate(
                {
                    _id: visitId,
                    source: "VISITOR_REQUEST",
                    status: "PENDING",
                    otpAttempts: {
                        $lt: MAX_OTP_ATTEMPTS,
                    },
                },
                {
                    $inc: {
                        otpAttempts: 1,
                    },
                },
                {
                    new: true,
                }
            );

        if (!updatedVisit) {
            const error = new Error(
                "Maximum OTP attempts exceeded. Please generate a new OTP"
            );
            error.statusCode = 400;
            throw error;
        }

        const error = new Error(
            "Invalid OTP"
        );
        error.statusCode = 400;
        throw error;
    }

    const resident =
        await User.findOne({
            unitId: visit.unitId,
            role: "RESIDENT",
            status: "ACTIVE",
        }).select("_id");

    if (!resident) {
        const error = new Error(
            "No active resident is assigned to this unit"
        );
        error.statusCode = 404;
        throw error;
    }

    const updatedVisit =
        await Visit.findOneAndUpdate(
            {
                _id: visitId,
                source: "VISITOR_REQUEST",
                status: "PENDING",
                otpHash: visit.otpHash,
                otpExpiresAt: {
                    $gte: new Date(),
                },
            },
            {
                $set: {
                    residentId:
                        resident._id,
                    otpHash: null,
                    otpExpiresAt: null,
                    otpAttempts: 0,
                },
            },
            {
                new: true,
            }
        );

    if (!updatedVisit) {
        const error = new Error(
            "OTP verification failed or the request has already been processed"
        );
        error.statusCode = 400;
        throw error;
    }

    return {
        visitId: updatedVisit._id,
        status: updatedVisit.status,
        residentId:
            updatedVisit.residentId,
        message:
            "OTP verified. Waiting for resident approval.",
    };
};

const getResidentVisitorRequests = async (
    residentId
) => {
    return await Visit.find({
        residentId,
        source: "VISITOR_REQUEST",
    })
        .populate(
            "buildingId",
            "name buildingNumber"
        )
        .populate(
            "unitId",
            "unitNumber floor type"
        )
        .sort({
            createdAt: -1,
        });
};

const approveVisitorRequest = async (
    residentId,
    visitId
) => {
    validateObjectId(
        visitId,
        "visitor request ID"
    );

    const updatedVisit =
        await Visit.findOneAndUpdate(
            {
                _id: visitId,
                residentId,
                source: "VISITOR_REQUEST",
                status: "PENDING",
            },
            {
                $set: {
                    status: "APPROVED",
                    approvedAt: new Date(),
                },
            },
            {
                new: true,
            }
        );

    if (!updatedVisit) {
        const existingVisit =
            await Visit.findOne({
                _id: visitId,
                residentId,
                source: "VISITOR_REQUEST",
            });

        if (!existingVisit) {
            const error = new Error(
                "Visitor request not found"
            );
            error.statusCode = 404;
            throw error;
        }

        const error = new Error(
            "Only pending visitor requests can be approved"
        );
        error.statusCode = 400;
        throw error;
    }

    const chatToken =
        await generateVisitorChatTokenForVisit(
            updatedVisit
        );

    // Once the resident approves, immediately issue the QR pass so the
    // visitor can display it. This keeps the state machine consistent with
    // the resident-invite flow (approval -> QR_GENERATED -> CHECKED_IN).
    const qr = await generateVisitQr(
        residentId,
        updatedVisit._id
    );

    // Let the security team know a new visitor pass is ready to scan.
    await notifyRole("SECURITY", {
        type: "VISITOR_APPROVED",
        title: "New visitor pass",
        message: `${updatedVisit.visitorName} was approved and has a QR pass ready.`,
        relatedId: updatedVisit._id,
    });

    return {
        visitId: updatedVisit._id,
        status: "QR_GENERATED",
        approvedAt:
            updatedVisit.approvedAt,
        visitorChatToken:
            chatToken.token,
        visitorChatTokenExpiresAt:
            chatToken.expiresAt,
        qrToken: qr.qrToken,
        qrExpiresAt: qr.expiresAt,
    };
};

const rejectVisitorRequest = async (
    residentId,
    visitId
) => {
    validateObjectId(
        visitId,
        "visitor request ID"
    );

    const updatedVisit =
        await Visit.findOneAndUpdate(
            {
                _id: visitId,
                residentId,
                source: "VISITOR_REQUEST",
                status: "PENDING",
            },
            {
                $set: {
                    status: "REJECTED",
                },
            },
            {
                new: true,
            }
        );

    if (!updatedVisit) {
        const existingVisit =
            await Visit.findOne({
                _id: visitId,
                residentId,
                source: "VISITOR_REQUEST",
            });

        if (!existingVisit) {
            const error = new Error(
                "Visitor request not found"
            );
            error.statusCode = 404;
            throw error;
        }

        const error = new Error(
            "Only pending visitor requests can be rejected"
        );
        error.statusCode = 400;
        throw error;
    }

    return {
        visitId: updatedVisit._id,
        status: updatedVisit.status,
    };
};

const generateVisitQr = async (
    userId,
    visitId
) => {
    validateObjectId(visitId, "visit ID");

    const visit = await Visit.findOne({
        _id: visitId,
        residentId: userId,
    }).select("+qrTokenHash");

    if (!visit) {
        const error = new Error(
            "Visit not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (
        visit.status !== "QR_GENERATED" &&
        visit.status !== "APPROVED"
    ) {
        const error = new Error(
            "QR can only be generated after OTP verification"
        );
        error.statusCode = 400;
        throw error;
    }

    const qrToken = crypto
        .randomBytes(32)
        .toString("hex");

    const qrTokenHash = await bcrypt.hash(
        qrToken,
        10
    );

    visit.qrTokenHash = qrTokenHash;

    visit.qrExpiresAt =
        new Date(Date.now() + QR_DURATION);

    visit.status = "QR_GENERATED";

    visit.qrScannedAt = null;
    visit.qrScannedBy = null;

    await visit.save();

    return {
        visitId: visit._id,
        qrToken,
        expiresAt: visit.qrExpiresAt,
    };
};

const scanVisitQr = async (
    securityId,
    qrToken
) => {
    if (!qrToken) {
        const error = new Error(
            "QR token is required"
        );
        error.statusCode = 400;
        throw error;
    }

    const now = new Date();

    const visits = await Visit.find({
        status: "QR_GENERATED",
        qrExpiresAt: {
            $gt: now,
        },
    }).select(
        "+qrTokenHash"
    );

    let matchedVisit = null;

    for (const visit of visits) {
        if (!visit.qrTokenHash) {
            continue;
        }

        const isValidToken =
            await bcrypt.compare(
                qrToken,
                visit.qrTokenHash
            );

        if (isValidToken) {
            matchedVisit = visit;
            break;
        }
    }

    if (!matchedVisit) {
        const error = new Error(
            "Invalid or expired QR"
        );
        error.statusCode = 400;
        throw error;
    }

    const scannedVisit =
        await Visit.findOneAndUpdate(
            {
                _id: matchedVisit._id,
                status: "QR_GENERATED",
                qrExpiresAt: {
                    $gt: new Date(),
                },
                qrScannedBy: null,
            },
            {
                $set: {
                    qrScannedAt: new Date(),
                    qrScannedBy: securityId,
                },
            },
            {
                new: true,
            }
        );

    if (!scannedVisit) {
        const error = new Error(
            "QR has already been scanned by another security officer"
        );
        error.statusCode = 400;
        throw error;
    }

    return {
        visitId: scannedVisit._id,
        visitorName:
            scannedVisit.visitorName,
        visitorEmail:
            scannedVisit.visitorEmail,
        visitorPhone:
            scannedVisit.visitorPhone,
        visitDate:
            scannedVisit.visitDate,
        visitStartTime:
            scannedVisit.visitStartTime,
        purpose:
            scannedVisit.purpose,
        status:
            scannedVisit.status,
        qrExpiresAt:
            scannedVisit.qrExpiresAt,
    };
};

const checkInVisit = async (
    securityId,
    visitId
) => {
    validateObjectId(
        visitId,
        "visit ID"
    );

    const visit =
        await Visit.findById(
            visitId
        );

    if (!visit) {
        const error = new Error(
            "Visit not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (
        visit.status !==
        "QR_GENERATED"
    ) {
        const error = new Error(
            "Only visitors with a valid QR can be checked in"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        !visit.qrExpiresAt ||
        new Date() >
            visit.qrExpiresAt
    ) {
        const error = new Error(
            "QR has expired"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        !visit.qrScannedAt ||
        !visit.qrScannedBy
    ) {
        const error = new Error(
            "QR must be scanned before check-in"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        visit.qrScannedBy.toString() !==
        securityId.toString()
    ) {
        const error = new Error(
            "QR was scanned by another security officer"
        );
        error.statusCode = 403;
        throw error;
    }

    const updatedVisit =
        await Visit.findOneAndUpdate(
            {
                _id: visitId,
                status: "QR_GENERATED",
                qrExpiresAt: {
                    $gt: new Date(),
                },
                qrScannedBy:
                    securityId,
            },
            {
                $set: {
                    status: "CHECKED_IN",
                    checkedInAt:
                        new Date(),
                    securityId,
                },
            },
            {
                new: true,
            }
        );

    if (!updatedVisit) {
        const error = new Error(
            "Visit has already been checked in or is no longer valid"
        );
        error.statusCode = 400;
        throw error;
    }

    await createNotification({
        userId: updatedVisit.residentId,
        type: "VISITOR_CHECKED_IN",
        title: "Visitor checked in",
        message: `${updatedVisit.visitorName} has checked in.`,
        relatedId: updatedVisit._id,
    });

    // Keep the security team informed of gate activity.
    await notifyRole("SECURITY", {
        type: "VISITOR_CHECKED_IN",
        title: "Visitor checked in",
        message: `${updatedVisit.visitorName} has checked in at the gate.`,
        relatedId: updatedVisit._id,
    });

    return {
        visitId:
            updatedVisit._id,
        visitorName:
            updatedVisit.visitorName,
        visitorEmail:
            updatedVisit.visitorEmail,
        visitorPhone:
            updatedVisit.visitorPhone,
        status:
            updatedVisit.status,
        checkedInAt:
            updatedVisit.checkedInAt,
        securityId:
            updatedVisit.securityId,
    };
};

const checkOutVisit = async (
    securityId,
    visitId
) => {
    validateObjectId(
        visitId,
        "visit ID"
    );

    const visit =
        await Visit.findById(
            visitId
        );

    if (!visit) {
        const error = new Error(
            "Visit not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (
        visit.status !==
        "CHECKED_IN"
    ) {
        const error = new Error(
            "Only checked-in visitors can be checked out"
        );
        error.statusCode = 400;
        throw error;
    }

    if (!visit.securityId) {
        const error = new Error(
            "No security officer is assigned to this visit"
        );
        error.statusCode = 400;
        throw error;
    }

    const updatedVisit =
        await Visit.findOneAndUpdate(
            {
                _id: visitId,
                status: "CHECKED_IN",
            },
            {
                $set: {
                    status: "CHECKED_OUT",
                    checkedOutAt:
                        new Date(),
                    checkOutSecurityId:
                        securityId,
                },
            },
            {
                new: true,
            }
        );

    if (!updatedVisit) {
        const error = new Error(
            "Visit has already been checked out"
        );
        error.statusCode = 400;
        throw error;
    }

    await createNotification({
        userId: updatedVisit.residentId,
        type: "VISITOR_CHECKED_OUT",
        title: "Visitor checked out",
        message: `${updatedVisit.visitorName} has checked out.`,
        relatedId: updatedVisit._id,
    });

    return {
        visitId:
            updatedVisit._id,
        visitorName:
            updatedVisit.visitorName,
        visitorEmail:
            updatedVisit.visitorEmail,
        visitorPhone:
            updatedVisit.visitorPhone,
        status:
            updatedVisit.status,
        checkedInAt:
            updatedVisit.checkedInAt,
        checkedOutAt:
            updatedVisit.checkedOutAt,
        securityId:
            updatedVisit.securityId,
        checkOutSecurityId:
            updatedVisit.checkOutSecurityId,
    };
};

const getSecurityVisits = async () => {
    await expireStaleVisits();

    return await Visit.find({})
        .populate(
            "residentId",
            "name email phone"
        )
        .populate(
            "buildingId",
            "name buildingNumber"
        )
        .populate(
            "unitId",
            "unitNumber floor type"
        )
        .populate(
            "securityId",
            "name email"
        )
        .populate(
            "checkOutSecurityId",
            "name email"
        )
        .sort({
            visitDate: -1,
            visitStartTime: -1,
        });
};

const getSecurityVisitById = async (
    visitId
) => {
    validateObjectId(
        visitId,
        "visit ID"
    );

    const visit =
        await Visit.findById(
            visitId
        )
            .populate(
                "residentId",
                "name email phone"
            )
            .populate(
                "buildingId",
                "name buildingNumber"
            )
            .populate(
                "unitId",
                "unitNumber floor type"
            )
            .populate(
                "securityId",
                "name email"
            );

    if (!visit) {
        const error = new Error(
            "Visit not found"
        );
        error.statusCode = 404;
        throw error;
    }

    return visit;
};

// =========================================================
// EXPIRY SWEEP
// =========================================================
// Marks stale visits as EXPIRED without breaking the main flow:
//  - PENDING visits whose OTP window has elapsed and was never verified
//  - QR_GENERATED visits whose QR window has elapsed before check-in
// It is safe to call repeatedly; it only touches documents that
// actually crossed their deadline.
const expireStaleVisits = async () => {
    const now = new Date();

    const otpResult = await Visit.updateMany(
        {
            status: "PENDING",
            otpExpiresAt: { $ne: null, $lt: now },
        },
        {
            $set: { status: "EXPIRED" },
        }
    );

    const qrResult = await Visit.updateMany(
        {
            status: "QR_GENERATED",
            qrExpiresAt: { $ne: null, $lt: now },
        },
        {
            $set: { status: "EXPIRED" },
        }
    );

    return {
        expiredOtpPending:
            otpResult.modifiedCount || 0,
        expiredQrGenerated:
            qrResult.modifiedCount || 0,
    };
};

module.exports = {
    createVisit,
    getMyVisits,
    getVisitById,
    generateVisitOtp,
    verifyVisitOtp,
    createVisitorRequest,
    getVisitorUnits,
    getVisitorRequestStatus,
    lookupVisitorRequests,
    generateVisitorRequestQr,
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
    expireStaleVisits,
};
