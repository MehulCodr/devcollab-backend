import { Resend } from "resend";
import { env } from "../../config/env.js";
import { BrevoProvider } from "./BrevoProvider.js";
import { adminNotificationTemplate } from "./templates/adminNotification.js";

const resend = new Resend(env.resendApiKey);

export class ResendProvider {
  static async sendEmail({ to, subject, html }) {
    if (!env.resendApiKey) {
      console.warn("⚠️ Resend API Key is missing. Skipping email delivery.");
      return false;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.resendFrom || "noreply@devcollab.com",
        to,
        subject,
        html
      });

      if (error) {
        console.error("Resend API Error:", error);
        
        // Notify admin via Brevo if Resend fails
        const adminEmail = env.brevoAdminEmail || "mehulgupta0910@gmail.com";
        const alertHtml = adminNotificationTemplate(
          "Resend Email Delivery Failed",
          JSON.stringify({ to, subject, error }, null, 2)
        );
        
        await BrevoProvider.sendEmail({
          to: adminEmail,
          subject: "Critical: Resend Delivery Failed",
          html: alertHtml
        });
        
        return false;
      }

      return data;
    } catch (err) {
      console.error("Error sending email via Resend:", err);
      return false;
    }
  }
}
