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

                <p>
                    Your visitor verification OTP is:
                </p>

                <div style="
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    margin: 25px 0;
                ">
                    ${otp}
                </div>

                <p>
                    This OTP will expire in <strong>5 minutes</strong>.
                </p>

                <p>
                    If you did not request this verification, please ignore this email.
                </p>

                <hr>

                <p style="color: #888; font-size: 12px;">
                    CivicSync — Smart Compound Management System
                </p>
            </div>
        `,
    });
};

module.exports = {
    sendOtpEmail,
};