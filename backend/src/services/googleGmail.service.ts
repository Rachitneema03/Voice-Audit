import { gmail_v1, google } from "googleapis";
import { getAuthenticatedClient } from "./googleOAuth.service";
import { GeminiResponse } from "./gemini.service";

/**
 * Create email message in RFC 2822 format
 */
function createEmailMessage(
  to: string,
  subject: string,
  body: string
): string {
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Send an email via Gmail
 */
export async function sendEmail(
  userId: string,
  data: GeminiResponse
): Promise<gmail_v1.Schema$Message> {
  if (data.action !== "email") {
    throw new Error("Invalid action type for Gmail service");
  }

  if (!data.recipient) {
    throw new Error("Email recipient is required");
  }

  if (!data.subject) {
    throw new Error("Email subject is required");
  }

  if (!data.body) {
    throw new Error("Email body is required");
  }

  const auth = await getAuthenticatedClient(userId);
  const gmail = google.gmail({ version: "v1", auth: auth as any });

  const rawMessage = createEmailMessage(
    data.recipient,
    data.subject,
    data.body
  );

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: rawMessage,
    },
  });

  if (!response.data) {
    throw new Error("Failed to send email");
  }

  return response.data;
}



