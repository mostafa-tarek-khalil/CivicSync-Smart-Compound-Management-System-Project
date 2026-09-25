const mongoose = require("mongoose");
const Visit = require("../models/visit");
const User = require("../models/user");
const Unit = require("../models/unit");
const Building = require("../models/building");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { sendOtpEmail, sendVisitorRequestEmail } = require("./emailService");
const { createNotification, notifyRole } = require("./notificationService");
const { isVisitChatAllowed } = require("../utils/statusConstants");

const VISITOR_CHAT_DURATION = 24 * 60 * 60 * 1000;
const OTP_DURATION = 5 * 60 * 1000;
const QR_DURATION = 30 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// A visitor reaches their own visit two ways: they requested access themselves
// (VISITOR_REQUEST) or a resident invited them (RESIDENT_INVITE). Every
// visitor-facing lookup/status/QR endpoint keys on the visitor's email, so both
// sources must be matched by anything a visitor looks up by email.
const VISITOR_OWNED_SOURCES = ["VISITOR_REQUEST", "RESIDENT_INVITE"];

/**
 * A QR pass may only be minted / shown from this long before the visit starts.
 *
 * The business rule is "QR code will be available 1 hour prior to your visit
 * scheduled time", which stops a pass from being screenshotted days in advance
 * and reused by whoever ends up holding the phone.
 */
const QR_LEAD_TIME_MS = 60 * 60 * 1000;

/**
 * The instant a visit's QR window opens: (visitDate + visitStartTime) minus the
 * lead time. `visitDate` is stored at midnight, so the time-of-day is parsed
 * out of `visitStartTime` ("HH:mm") and applied explicitly.
 *
 * Returns null when the visit has no usable schedule, in which case callers
 * treat the rule as "no restriction" rather than locking the pass forever.
 */
const getQrAvailableFrom = (visit) => {
    if (!visit?.visitDate || !visit?.visitStartTime) {
        return null;
    }

    const scheduled = new Date(visit.visitDate);

    if (Number.isNaN(scheduled.getTime())) {
        return null;
    }

    const [hours, minutes] = String(visit.visitStartTime)
        .split(":")
        .map((part) => Number(part));

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    scheduled.setHours(hours, minutes, 0, 0);

    return new Date(scheduled.getTime() - QR_LEAD_TIME_MS);
};

/**
 * Throw a 400 when the QR is requested too early, with a message the UI shows
 * verbatim. Returns the availability timestamp so callers can include it.
 */
const assertQrWindowOpen = (visit) => {
    const availableFrom = getQrAvailableFrom(visit);

    if (!availableFrom) {
        return null;
    }

    if (new Date() < availableFrom) {
        const error = new Error(
            "QR code will be available 1 hour prior to your visit scheduled time."
        );
        error.statusCode = 400;
        error.code = "QR_NOT_YET_AVAILABLE";
        error.availableFrom = availableFrom;
        throw error;
    }

    return availableFrom;
};

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

    visit.visitorChatTokenRaw = rawToken;

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

/**
 * Return a usable visitor chat token for a visit, minting one only when
 * necessary.
 *
 * Why this exists: generateVisitorChatTokenForVisit always creates a NEW token
 * and overwrites the stored hash, which invalidates any token already handed to
 * the visitor. The visitor status endpoint is polled, so calling the plain
 * generator there would break chat on every poll. This variant reuses the raw
 * token when it is still valid (the model keeps a copy in `qrToken`-style
 * plaintext only for this purpose) and only regenerates otherwise.
 */
const getOrCreateVisitorChatTokenForVisit = async (
    visit
) => {
    if (!visit) {
        const error = new Error("Visit is required");
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

    // Reload with the raw token + hash, which are select:false by default.
    const fresh = await Visit.findById(visit._id).select(
        "+visitorChatTokenHash +visitorChatTokenRaw"
    );

    if (!fresh) {
        const error = new Error("Visit not found");
        error.statusCode = 404;
        throw error;
    }

    const stillValid =
        fresh.visitorChatTokenHash &&
        fresh.visitorChatTokenRaw &&
        fresh.visitorChatTokenExpiresAt &&
        fresh.visitorChatTokenExpiresAt > new Date();

    if (stillValid) {
        return {
            token: fresh.visitorChatTokenRaw,
            expiresAt: fresh.visitorChatTokenExpiresAt,
        };
    }

    return generateVisitorChatTokenForVisit(fresh);
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
    }).select("name unitId");

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
        // The resident is the host and created this invite themselves, so it is
        // considered pre-approved: no OTP/approval round-trip is needed before
        // the visitor can be issued a QR pass (subject to the 1-hour window).
        status: "APPROVED",
        approvedAt: new Date(),
        visitDate: parsedDate,
        visitStartTime,
        purpose: purpose || null,
    });

    // Send the visitor the full visit details so they know the date, time and
    // location in writing, even without a CivicSync account. A mail failure
    // must never fail the creation of the invite.
    try {
        await sendVisitorRequestEmail({
            to: visit.visitorEmail,
            visitorName: visit.visitorName,
            residentName: resident.name,
            buildingName: building.name,
            unitNumber: unit.unitNumber,
            visitDate: visit.visitDate,
            visitStartTime: visit.visitStartTime,
            purpose: visit.purpose,
            statusUrl: null,
            subject: "CivicSync - You have been invited for a visit",
            intro:
                `${resident.name || "A resident"} has invited you to visit ` +
                `${building.name}${unit.unitNumber ? `, Unit ${unit.unitNumber}` : ""}. ` +
                "Here are your visit details:",
            nextSteps: [
                "The resident will confirm your visit.",
                "You will receive a verification code at this email address.",
                "Your QR pass becomes available 1 hour before the visit time.",
            ],
        });
    } catch (error) {
        console.error(
            "Failed to send visitor invite email:",
            error.message
        );
    }

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

    // Acknowledge the request to the VISITOR's own address with the full
    // details, so someone without a CivicSync account still has the date, time
    // and location in writing. A mail failure must never fail the request.
    const visitorStatusUrl =
        `${process.env.FRONTEND_URL || "http://localhost:4200"}` +
        `/visitor-request-status?id=${visit._id}` +
        `&email=${encodeURIComponent(visit.visitorEmail)}`;

    try {
        await sendVisitorRequestEmail({
            to: visit.visitorEmail,
            visitorName: visit.visitorName,
            residentName: resident.name,
            buildingName: building.name,
            unitNumber: unit.unitNumber,
            visitDate: visit.visitDate,
            visitStartTime: visit.visitStartTime,
            purpose: visit.purpose,
            statusUrl: visitorStatusUrl,
        });
    } catch (error) {
        console.error(
            "Failed to send visitor request email:",
            error.message
        );
    }

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
        source: { $in: VISITOR_OWNED_SOURCES },
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

    // Expose visitor chat only once the visit is actually chat-eligible, and
    // hand the visitor their own token (the resident gets a copy on approval,
    // but the visitor has no other way to reach the conversation). The visitor
    // has already proven ownership of this visit by supplying its email.
    //
    // Eligibility is decided by STATUS alone. Requiring an existing, unexpired
    // visitorChatTokenExpiresAt here would be circular: the token is minted on
    // demand below, so an APPROVED visit that never had one could never get
    // one. The chat service re-checks the window at send time.
    const chatEligible = isVisitChatAllowed(visit.status);

    const result = visit.toObject();

    // Expose when the pass becomes available so the client can render "QR code
    // will be available 1 hour prior..." without duplicating the rule.
    result.qrAvailableFrom = getQrAvailableFrom(visit);

    if (chatEligible) {
        // Reuse the existing token while it is still valid; minting a new one
        // here would invalidate the token the visitor is already holding,
        // because this endpoint is polled.
        const chatToken = await getOrCreateVisitorChatTokenForVisit(visit);
        result.visitorChatToken = chatToken.token;
        result.visitorChatTokenExpiresAt = chatToken.expiresAt;
    }

    return result;
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
        source: { $in: VISITOR_OWNED_SOURCES },
        visitorEmail: normalizedEmail,
    })
        .populate("residentId", "name")
        .populate("buildingId", "name buildingNumber")
        .populate("unitId", "unitNumber floor type")
        .sort({ createdAt: -1 })
        .limit(25);
};

const generateVisitorRequestQr = async (visitId, visitorEmail) => {
    validateObjectId(visitId, "visitor request ID");

    if (!visitorEmail || typeof visitorEmail !== "string") {
        const error = new Error("Visitor email is required");
        error.statusCode = 400;
        throw error;
    }

    const normalizedEmail = visitorEmail.trim().toLowerCase();

    const visit = await Visit.findOne({
        _id: visitId,
        source: { $in: VISITOR_OWNED_SOURCES },
        visitorEmail: normalizedEmail,
    }).select("+qrTokenHash +qrToken");

    if (!visit) {
        const error = new Error("Visitor request not found");
        error.statusCode = 404;
        throw error;
    }

    if (visit.status === "EXPIRED") {
        const error = new Error(
            "This visitor pass has expired. Ask the resident to approve a new visit."
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        visit.status !== "APPROVED" &&
        visit.status !== "QR_GENERATED"
    ) {
        const error = new Error(
            "QR is available only after resident approval"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        visit.status === "QR_GENERATED" &&
        visit.qrToken &&
        visit.qrExpiresAt &&
        visit.qrExpiresAt > new Date()
    ) {
        return {
            visitId: visit._id,
            qrToken: visit.qrToken,
            expiresAt: visit.qrExpiresAt,
            qrAvailableFrom: getQrAvailableFrom(visit),
        };
    }

    if (!visit.residentId) {
        const error = new Error(
            "This visitor request is not linked to a resident"
        );
        error.statusCode = 400;
        throw error;
    }

    // Same 1-hour rule as the resident flow, enforced before minting so the
    // visitor sees the friendly message instead of a pass they cannot use.
    assertQrWindowOpen(visit);

    return generateVisitQr(
        visit.residentId,
        visit._id
    );
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
    // Both ways a visit can be linked to this resident: a visitor asking for
    // access (VISITOR_REQUEST) and the resident inviting someone directly
    // (RESIDENT_INVITE). The resident's visitor list is the single place they
    // manage all of their visits, so it must show both, not just the requests.
    return await Visit.find({
        residentId,
        source: { $in: VISITOR_OWNED_SOURCES },
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
    }).select("+qrTokenHash +qrToken");

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

    // A pass is only minted from 1 hour before the scheduled visit. Checked
    // BEFORE the idempotency guard so an already-issued token cannot be handed
    // out early either.
    const qrAvailableFrom = assertQrWindowOpen(visit);

    // IDEMPOTENCY GUARD:
    // If a QR was already issued for this visit and it is still valid
    // (not expired), re-issue the SAME raw token instead of minting a new
    // one. Regenerating on every call used to wipe qrScannedAt/qrScannedBy
    // whenever the visitor simply reloaded/revisited the QR screen, which
    // silently undid a scan security had already performed and broke
    // check-in right after. We only mint a fresh token when there isn't a
    // usable one yet (first time after approval, or the previous one
    // expired).
    const hasUsableExistingToken =
        visit.status === "QR_GENERATED" &&
        visit.qrToken &&
        visit.qrExpiresAt &&
        visit.qrExpiresAt > new Date();

    if (hasUsableExistingToken) {
        return {
            visitId: visit._id,
            qrToken: visit.qrToken,
            expiresAt: visit.qrExpiresAt,
            qrAvailableFrom,
        };
    }

    const qrToken = crypto
        .randomBytes(32)
        .toString("hex");

    const qrTokenHash = await bcrypt.hash(
        qrToken,
        10
    );

    visit.qrTokenHash = qrTokenHash;
    visit.qrToken = qrToken;

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
        qrAvailableFrom,
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
                    // Scanning claims the pass and moves it to QR_SCANNED. The
                    // gate operator then performs CHECK_IN / CHECK_OUT.
                    status: "QR_SCANNED",
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
        "QR_SCANNED" &&
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
                status: {
                    $in: ["QR_SCANNED", "QR_GENERATED"],
                },
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
                    qrToken: null,
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
            $set: { status: "EXPIRED", qrToken: null },
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
    getOrCreateVisitorChatTokenForVisit,
    getQrAvailableFrom,
    assertQrWindowOpen,
    QR_LEAD_TIME_MS,
    expireStaleVisits,
};