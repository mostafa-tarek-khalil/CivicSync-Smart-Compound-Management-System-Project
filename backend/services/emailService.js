const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});

const sendOtpEmail = async (to, otp, visitorName) => {
    await transporter.sendMail({
        from: `"CivicSync" <${process.env.EMAIL_USER}>`,
        to,
        subject: "CivicSync - Visitor Verification OTP",
        text: `Hello ${visitorName},

Your CivicSync visitor verification OTP is:

${otp}

This OTP will expire in 5 minutes.

If you did not request this verification, please ignore this email.

CivicSync
Smart Compound Management System`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                <h2 style="margin-bottom: 5px;">CivicSync</h2>
                <p style="color: #666; margin-top: 0;">
                    Smart Compound Management System
                </p>
                <p>Hello ${visitorName},</p>
                <p>Your visitor verification OTP is:</p>
                <div style="
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    margin: 25px 0;
                ">
                    ${otp}
                </div>
                <p>This OTP will expire in <strong>5 minutes</strong>.</p>
                <p>If you did not request this verification, please ignore this email.</p>
                <hr>
                <p style="color: #888; font-size: 12px;">
                    CivicSync — Smart Compound Management System
                </p>
            </div>
        `,
    });
};

const sendPasswordResetEmail = async (to, token) => {
    const resetUrl =
        `${process.env.FRONTEND_URL || "http://localhost:4200"}` +
        `/reset-password?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
        from: `"CivicSync" <${process.env.EMAIL_USER}>`,
        to,
        subject: "CivicSync - Reset your password",
        text: `Hello,

We received a request to reset your CivicSync password.

Open this link to choose a new password:

${resetUrl}

This link will expire in 15 minutes.

If you did not request a password reset, you can safely ignore this email.

CivicSync
Smart Compound Management System`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                <h2 style="margin-bottom: 5px;">CivicSync</h2>
                <p style="color: #666; margin-top: 0;">
                    Smart Compound Management System
                </p>
                <p>Hello,</p>
                <p>We received a request to reset your CivicSync password.</p>
                <p>
                    <a
                        href="${resetUrl}"
                        style="
                            display: inline-block;
                            padding: 12px 22px;
                            background: #315b8f;
                            color: #ffffff;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: bold;
                        "
                    >
                        Reset password
                    </a>
                </p>
                <p style="color: #666; font-size: 13px;">
                    Or copy this link into your browser:<br />
                    <span style="word-break: break-all;">${resetUrl}</span>
                </p>
                <p>This link will expire in <strong>15 minutes</strong>.</p>
                <p>If you did not request a password reset, you can safely ignore this email.</p>
                <hr>
                <p style="color: #888; font-size: 12px;">
                    CivicSync — Smart Compound Management System
                </p>
            </div>
        `,
    });
};

/**
 * Tell a visitor their visit details.
 *
 * Used by both flows:
 *  - a visitor requesting access to a unit (Flow 1), and
 *  - a resident inviting a visitor directly (resident invite).
 *
 * The optional `intro` / `subject` / `nextSteps` let the caller reword the
 * message for each flow while sharing the same detail table. Sent as soon as
 * the visit is created so the visitor has a record of the date/time and what to
 * expect next, without an account.
 */
const sendVisitorRequestEmail = async ({
    to,
    visitorName,
    residentName,
    buildingName,
    unitNumber,
    visitDate,
    visitStartTime,
    purpose,
    statusUrl,
    intro,
    subject,
    nextSteps,
}) => {
    const day = visitDate
        ? new Date(visitDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        })
        : "To be confirmed";

    const detailRows = [
        ["Resident", residentName || "Your host"],
        ["Location", [buildingName, unitNumber ? `Unit ${unitNumber}` : null]
            .filter(Boolean)
            .join(" · ") || "—"],
        ["Date", day],
        ["Time", visitStartTime || "—"],
        ["Purpose", purpose || "Visit"],
    ];

    const introText =
        intro ||
        "Your visit request has been submitted to CivicSync. Here are the details:";

    const steps =
        nextSteps || [
            "The resident reviews and approves your request.",
            "You will receive a verification code at this email address.",
            "Your QR pass becomes available 1 hour before the visit time.",
        ];

    const text = [
        `Hello ${visitorName || "there"},`,
        "",
        introText,
        "",
        ...detailRows.map(([label, value]) => `${label}: ${value}`),
        "",
        "What happens next:",
        ...steps.map((step, index) => `${index + 1}. ${step}`),
        "",
        statusUrl ? `Track your request: ${statusUrl}` : "",
        "",
        "CivicSync",
        "Smart Compound Management System",
    ]
        .filter((line) => line !== "")
        .join("\n");

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2 style="margin-bottom: 5px;">CivicSync</h2>
            <p style="color: #666; margin-top: 0;">
                Smart Compound Management System
            </p>

            <p>Hello ${visitorName || "there"},</p>

            <p>${introText}</p>

            <table style="border-collapse: collapse; width: 100%; margin: 18px 0;">
                ${detailRows
                    .map(
                        ([label, value]) => `
                    <tr>
                        <td style="padding: 8px 12px; background: #f4f6fb; font-weight: bold; width: 120px;">
                            ${label}
                        </td>
                        <td style="padding: 8px 12px;">${value}</td>
                    </tr>`
                    )
                    .join("")}
            </table>

            <p style="font-weight: bold; margin-bottom: 6px;">What happens next</p>
            <ol style="color: #444; padding-inline-start: 20px;">
                ${steps.map((step) => `<li>${step}</li>`).join("")}
            </ol>

            ${
                statusUrl
                    ? `<p>
                    <a href="${statusUrl}" style="display: inline-block; padding: 12px 22px;
                        background: #315b8f; color: #ffffff; border-radius: 8px;
                        text-decoration: none; font-weight: bold;">
                        Track your request
                    </a>
                </p>`
                    : ""
            }

            <hr>
            <p style="color: #888; font-size: 12px;">
                CivicSync — Smart Compound Management System
            </p>
        </div>
    `;

    await transporter.sendMail({
        from: `"CivicSync" <${process.env.EMAIL_USER}>`,
        to,
        subject: subject || "CivicSync - Your visit details",
        text,
        html,
    });
};

module.exports = {
    sendOtpEmail,
    sendPasswordResetEmail,
    sendVisitorRequestEmail,
};