"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const googleapis_1 = require("googleapis");
const googleOAuth_service_1 = require("./googleOAuth.service");
/**
 * Create email message in RFC 2822 format
 */
function createEmailMessage(to, subject, body) {
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
async function sendEmail(userId, data) {
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
    const auth = await (0, googleOAuth_service_1.getAuthenticatedClient)(userId);
    const gmail = googleapis_1.google.gmail({ version: "v1", auth: auth });
    const rawMessage = createEmailMessage(data.recipient, data.subject, data.body);
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
//# sourceMappingURL=googleGmail.service.js.map