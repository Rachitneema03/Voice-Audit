import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface GeminiResponse {
  action?: "calendar" | "task" | "email" | "unknown";
  actions?: GeminiResponse[];
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  duration?: number;
  location?: string;
  recipient?: string;
  subject?: string;
  body?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high";
}


export async function analyzeText(
  text: string,
  userName: string = "User"
): Promise<GeminiResponse> {

  // � Compute current date info for accurate date resolution
  const now = new Date();
  const todayDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();

  // 🔐 Validate API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not set in .env file.");
  }

  console.log("🔍 Calling Gemini with:", text.substring(0, 50) + "...");
  console.log("👤 Sender name:", userName);
  console.log("📅 Today's date:", todayDate, "| Current year:", currentYear);

  // 🧠 Model selection
  let model;
  try {
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  } catch {
    try {
      model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });
    } catch {
      model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    }
  }

  const prompt = `You are a smart assistant that extracts structured information from user commands.

==================== CURRENT DATE CONTEXT ====================
Today's date is: ${todayDate}
Current year is: ${currentYear}
Current month is: ${currentMonth}
Current day is: ${currentDay}
===============================================================

==================== DATE RULES (CRITICAL) ====================
- If user says "today", use EXACTLY: ${todayDate}
- If user says "tomorrow", calculate today + 1 day = ${new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
- If user says "next week", add 7 days to today's date.
- If user does NOT specify a year, ALWAYS assume the current year: ${currentYear}
- NEVER return a year before ${currentYear}. This is absolutely forbidden.
- All dates MUST be in YYYY-MM-DD format (ISO format).
- When user mentions a day of the week (Monday, Tuesday, etc.), calculate the NEXT occurrence from today.
===============================================================

User input: "${text}"

CRITICAL:
- You MUST return ONLY a valid JSON object.
- No markdown, no explanation, no extra text.

Decide the intent strictly:

1. If user is asking to schedule a meeting, event, or appointment → action: "calendar"
2. If user is asking to create a task or reminder → action: "task"
3. If user is asking to write or send an email → action: "email"
4. Otherwise → action: "unknown"

------------------------------------
FOR CALENDAR ACTION:
Return JSON with:
{
  "action": "calendar",
  "title": "...",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "duration": number (in minutes),
  "location": "..."
}

CALENDAR DATE EXAMPLES (based on today = ${todayDate}):
- "tomorrow at 5pm" → date: "${new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]}", time: "17:00"
- "today at 3pm" → date: "${todayDate}", time: "15:00"
- "next Monday" → calculate the next Monday from ${todayDate}
- "January 25" → date: "${currentYear}-01-25" (use current year)

------------------------------------
FOR TASK ACTION:
Return JSON with:
{
  "action": "task",
  "title": "...",
  "dueDate": "YYYY-MM-DD",
  "priority": "low" | "medium" | "high"
}

------------------------------------
FOR EMAIL ACTION:
 recipient
- subject
- body (complete professional email, 120–150 words)

EMAIL BODY RULES:
- Write only the email body content.
- Do NOT include any signature or sign-off.
- Do NOT include "Best regards", "Sincerely", "Thanks", etc.
- Do NOT include sender name.
- The system will add the signature automatically.

------------------------------------
IMPORTANT:
- If the intent is calendar, DO NOT return email.
- If the intent is email, DO NOT return calendar.
- Choose ONLY ONE action.
- REMEMBER: The current year is ${currentYear}. NEVER use any year before this.

Return ONLY the JSON object.`;

  let result: any;

  try {
    result = await model.generateContent(prompt);

    const responseText = result?.response?.text();
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    // 🧹 Clean response
    let cleanedText = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    let parsed: GeminiResponse;

    try {
      parsed = JSON.parse(cleanedText);
    } catch (err: any) {
      throw new Error("JSON parse failed: " + err.message);
    }

    /* ================= DATE VALIDATION & FIX (CRITICAL) ================= */
    // Backend safety layer: NEVER trust Gemini blindly for dates
    // This ensures no calendar event or task is ever created in a past year
    
    const validateAndFixDate = (dateStr: string | undefined, fieldName: string): string | undefined => {
      if (!dateStr) return dateStr;
      
      try {
        const parsedDate = new Date(dateStr);
        const currentYear = new Date().getFullYear();
        
        // Check if date is valid
        if (isNaN(parsedDate.getTime())) {
          console.warn(`⚠️ Invalid ${fieldName} returned by Gemini: ${dateStr}`);
          return undefined;
        }
        
        // Fix past year - CRITICAL: Gemini sometimes returns wrong years
        if (parsedDate.getFullYear() < currentYear) {
          console.warn(`⚠️ Fixing past year in ${fieldName}: ${dateStr} → changing year to ${currentYear}`);
          parsedDate.setFullYear(currentYear);
          
          // If the fixed date is still in the past (e.g., Jan 1 when we're in Dec), 
          // it might be intended for next year
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (parsedDate < today) {
            // Date has already passed this year, assume next year
            parsedDate.setFullYear(currentYear + 1);
            console.warn(`⚠️ Date already passed this year, using next year: ${parsedDate.toISOString().split("T")[0]}`);
          }
          
          return parsedDate.toISOString().split("T")[0];
        }
        
        return dateStr;
      } catch (e) {
        console.error(`❌ Error validating ${fieldName}:`, e);
        return dateStr;
      }
    };
    
    // Apply date validation to calendar events
    if (parsed.action === "calendar" && parsed.date) {
      parsed.date = validateAndFixDate(parsed.date, "calendar date");
      console.log("📅 Validated calendar date:", parsed.date);
    }
    
    // Apply date validation to tasks
    if (parsed.action === "task" && parsed.dueDate) {
      parsed.dueDate = validateAndFixDate(parsed.dueDate, "task dueDate");
      console.log("📅 Validated task dueDate:", parsed.dueDate);
    }
    
    // Apply date validation to multiple actions (if present)
    if (parsed.actions && Array.isArray(parsed.actions)) {
      parsed.actions = parsed.actions.map((action, index) => {
        if (action.action === "calendar" && action.date) {
          action.date = validateAndFixDate(action.date, `actions[${index}].date`);
        }
        if (action.action === "task" && action.dueDate) {
          action.dueDate = validateAndFixDate(action.dueDate, `actions[${index}].dueDate`);
        }
        return action;
      });
    }
    /* ================= END DATE VALIDATION ================= */

    /* ================= EMAIL BODY CLEANUP ================= */
    // NOTE: Signature is NOT added here. It is handled by gmail.service.ts
    // using the actual Google account name from OAuth profile.
    // Any AI-generated signature will be removed by the Gmail service.
    /* ================= END CLEANUP ================= */

    // ✅ Validate action
    if (!parsed.action && !parsed.actions) {
      throw new Error("Missing action in Gemini response");
    }

    return parsed;

  } catch (error: any) {
    console.error("❌ Gemini error:", error.message);

    // 🔁 Fallback logic
    const lowerText = text.toLowerCase();
    let fallbackAction: "calendar" | "task" | "email" | "unknown" = "unknown";

    if (lowerText.includes("meet") || lowerText.includes("schedule")) {
      fallbackAction = "calendar";
    } else if (lowerText.includes("task") || lowerText.includes("todo")) {
      fallbackAction = "task";
    } else if (lowerText.includes("email") || lowerText.includes("mail")) {
      fallbackAction = "email";
    }

    return {
      action: fallbackAction,
      title: text.substring(0, 50),
      description: "AI parsing failed. Please refine the input."
    };
  }
}
