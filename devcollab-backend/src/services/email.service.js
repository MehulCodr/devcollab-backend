import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: env.smtpFromEmail || "noreply@devcollab.com",
      to,
      subject,
      html,
    });
    return info;
  } catch (error) {
    console.error("Error sending email: ", error);

    // Bypass email failure in all environments so strict SMTP IP checks (like on Render)
    // don't block the authentication flow. We already log the OTP to the console.
    console.warn("⚠️ Bypassing email failure. Check the server terminal/logs for the OTP.");
    return true;
  }
};

export const sendOTP = async (to, otp, purpose) => {
  // Always log OTP for testing purposes since SMTP might block Render IPs
  console.log(`\n========================================`);
  console.log(`[AUTH] OTP Generated for ${to}`);
  console.log(`[AUTH] Purpose: ${purpose}`);
  console.log(`[AUTH] 🔑 OTP: ${otp}`);
  console.log(`========================================\n`);

  let subject = "";
  let html = "";

  if (purpose === "signup") {
    subject = "Verify your DevCollaborator Account";
    html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to DevCollaborator!</h2>
        <p>Please use the following OTP to verify your email address. This OTP is valid for 10 minutes.</p>
        <h1 style="color: #4F46E5; letter-spacing: 5px;">${otp}</h1>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;
  } else if (purpose === "reset_password" || purpose === "forgot_password") {
    subject = "Reset your DevCollaborator Password";
    html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Please use the following OTP to reset your password. This OTP is valid for 10 minutes.</p>
        <h1 style="color: #EF4444; letter-spacing: 5px;">${otp}</h1>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;
  } else if (purpose === "change_password") {
    subject = "Change your DevCollaborator Password";
    html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Change Request</h2>
        <p>We received a request to change your password. Please use the following OTP to confirm your new password. This OTP is valid for 10 minutes.</p>
        <h1 style="color: #F59E0B; letter-spacing: 5px;">${otp}</h1>
        <p>If you did not request this, please secure your account immediately.</p>
      </div>
    `;
  }

  return sendEmail({ to, subject, html });
};
