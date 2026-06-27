import { env } from "../../config/env.js";

export class BrevoProvider {
  static async sendEmail({ to, subject, html }) {
    if (!env.brevoApiKey) {
      console.warn("⚠️ Brevo API Key is missing. Skipping email delivery.");
      return false;
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": env.brevoApiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: {
            name: "DevCollaborator System",
            email: "noreply@devcollab.com"
          },
          to: [{ email: to }],
          subject,
          htmlContent: html
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Brevo API Error:", errorData);
        return false;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error sending email via Brevo:", error);
      return false;
    }
  }
}
