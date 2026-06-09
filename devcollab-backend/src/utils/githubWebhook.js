import crypto from "crypto";
import { env } from "../config/env.js";

export const verifyGithubWebhookSignature = ({ rawBody, signature }) => {
  if (!signature) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", env.githubWebhookSecret)
    .update(rawBody)
    .digest("hex")}`;

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

export const extractIssueNumbersFromText = (text = "") => {
  const pattern = /\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)\b/gi;
  const issueNumbers = new Set();

  let match = pattern.exec(text);

  while (match) {
    issueNumbers.add(Number(match[1]));
    match = pattern.exec(text);
  }

  return [...issueNumbers];
};