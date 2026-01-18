import { gmail_v1, google } from "googleapis";
import { getAuthenticatedClient, getUserProfile } from "./googleOAuth.service";
import { GeminiResponse } from "./gemini.service";

/**
 * Remove any AI-generated signature from email body
 * This ensures we always use the real Google account name
 */
function removeAISignature(body: string): string {
  // Remove common sign-off patterns that AI might generate
  const signaturePattern = /(best regards,|regards,|sincerely,|thanks,|thank you,|cheers,|warm regards,|kind regards,)[\s\S]*$/i;
  return body.replace(signaturePattern, "").trim();
}

/**
 * Append enforced signature with real Google account name
 */
function appendSignature(body: string, senderName: string): string {
  return `${body}\n\nBest regards,\n${senderName}`;
}

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
 * CRITICAL: Always uses the real Google account name for signature
 * Never trusts AI-generated signatures
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

  // Step 1: Get authenticated client
  const auth = await getAuthenticatedClient(userId);
  const gmail = google.gmail({ version: "v1", auth: auth as any });

  // Step 2: Get user profile (tries Firestore first, then Google API)
  console.log("📧 Preparing email with proper signature...");
  const userProfile = await getUserProfile(userId);
  
  // Step 3: Determine sender name (use profile name, fallback to email prefix)
  let senderName = userProfile.name;
  if (!senderName || senderName.trim() === "") {
    // Fallback: extract name from email (before @)
    senderName = userProfile.email.split("@")[0];
    console.log("⚠️  Using email prefix as sender name:", senderName);
  }
  console.log("✅ Sender name for signature:", senderName);

  // Step 4: Remove any AI-generated signature from body
  let emailBody = removeAISignature(data.body);
  console.log("🧹 Removed any AI-generated signature");

  // Step 5: Append enforced signature with real Google account name
  emailBody = appendSignature(emailBody, senderName);
  console.log("✅ Appended enforced signature with:", senderName);

  // Step 6: Create and send email
  const rawMessage = createEmailMessage(
    data.recipient,
    data.subject,
    emailBody
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

  console.log("✅ Email sent successfully with signature: Best regards,", senderName);
  return response.data;
}



