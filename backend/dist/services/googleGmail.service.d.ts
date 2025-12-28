import { gmail_v1 } from "googleapis";
import { GeminiResponse } from "./gemini.service";
/**
 * Send an email via Gmail
 */
export declare function sendEmail(userId: string, data: GeminiResponse): Promise<gmail_v1.Schema$Message>;
//# sourceMappingURL=googleGmail.service.d.ts.map