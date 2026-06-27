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
    
    // In development, we don't want a broken SMTP to block the auth flow.
    // We already log the OTP (added below) so the user can just copy it from the terminal.
    if (env.nodeEnv === "development") {
      console.warn("⚠️ Bypassing email failure in development mode. Check the terminal for the OTP.");
      return true;
    }
    
    throw new Error("Failed to send email");
  }
};

export const sendOTP = async (to, otp, purpose) => {
  if (env.nodeEnv === "development") {
    console.log(`\n========================================`);
    console.log(`[DEV MODE] OTP Generated for ${to}`);
    console.log(`[DEV MODE] Purpose: ${purpose}`);
    console.log(`[DEV MODE] 🔑 OTP: ${otp}`);
    console.log(`========================================\n`);
  }

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
