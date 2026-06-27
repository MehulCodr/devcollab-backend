import { env } from "../../config/env.js";
import { ResendProvider } from "./ResendProvider.js";
import { BrevoProvider } from "./BrevoProvider.js";

// Templates
import { signupOtpTemplate } from "./templates/signupOtp.js";
import { forgotPasswordTemplate } from "./templates/forgotPassword.js";
import { changePasswordTemplate } from "./templates/changePassword.js";
import { loginOtpTemplate } from "./templates/loginOtp.js";
import { welcomeTemplate } from "./templates/welcome.js";
import { adminNotificationTemplate } from "./templates/adminNotification.js";
import { securityAlertTemplate } from "./templates/securityAlert.js";

export class EmailService {
  /**
   * Helper to log OTPs to console during development/testing
   */
  static _logOTP(to, purpose, otp) {
    console.log(`\n========================================`);
    console.log(`[AUTH] OTP Generated for ${to}`);
    console.log(`[AUTH] Purpose: ${purpose}`);
    console.log(`[AUTH] 🔑 OTP: ${otp}`);
    console.log(`========================================\n`);
  }

  // ==========================================
  // User Emails (Sent via Resend)
  // ==========================================

  static async sendSignupOTP(to, otp) {
    this._logOTP(to, "signup", otp);
    return await ResendProvider.sendEmail({
      to,
      subject: "Verify your DevCollaborator Account",
      html: signupOtpTemplate(otp)
    });
  }

  static async sendForgotPasswordOTP(to, otp) {
    this._logOTP(to, "forgot_password", otp);
    return await ResendProvider.sendEmail({
      to,
      subject: "Reset your DevCollaborator Password",
      html: forgotPasswordTemplate(otp)
    });
  }

  static async sendChangePasswordOTP(to, otp) {
    this._logOTP(to, "change_password", otp);
    return await ResendProvider.sendEmail({
      to,
      subject: "Change your DevCollaborator Password",
      html: changePasswordTemplate(otp)
    });
  }

  static async sendLoginOTP(to, otp) {
    this._logOTP(to, "login", otp);
    return await ResendProvider.sendEmail({
      to,
      subject: "Login to DevCollaborator",
      html: loginOtpTemplate(otp)
    });
  }

  static async sendWelcomeEmail(to, name) {
    return await ResendProvider.sendEmail({
      to,
      subject: "Welcome to DevCollaborator!",
      html: welcomeTemplate(name)
    });
  }

  // ==========================================
  // Admin & System Emails (Sent via Brevo)
  // ==========================================

  static async sendAdminNotification(subject, message, details = "") {
    const adminEmail = env.brevoAdminEmail;
    if (!adminEmail) return false;

    return await BrevoProvider.sendEmail({
      to: adminEmail,
      subject,
      html: adminNotificationTemplate(message, details)
    });
  }

  static async sendSecurityAlert(subject, message, details = "") {
    const adminEmail = env.brevoAdminEmail;
    if (!adminEmail) return false;

    return await BrevoProvider.sendEmail({
      to: adminEmail,
      subject: `[SECURITY ALERT] ${subject}`,
      html: securityAlertTemplate(message, details)
    });
  }
}
