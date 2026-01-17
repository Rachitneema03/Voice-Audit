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

  // 🔐 Validate API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not set in .env file.");
  }

  console.log("🔍 Calling Gemini with:", text.substring(0, 50) + "...");
  console.log("👤 Sender name:", userName);

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

User input: "${text}"

CRITICAL: You MUST return ONLY a valid JSON object.
No markdown, no explanations, no extra text.

Rules:
1. Meeting/event → action: "calendar"
2. Task/todo → action: "task"
3. Email → action: "email"
4. Otherwise → action: "unknown"

For EMAIL actions:
- recipient
- subject
- body (complete professional email, 120–150 words)
Always end emails with:
Best regards,
[Your Name]

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

    /* ================= EMAIL SIGNATURE FIX ================= */
    if (parsed.action === "email" && parsed.body) {
      const senderName = userName?.trim() || "User";

      parsed.body = parsed.body.replace(
        /\[Your Name\]/gi,
        senderName
      );

      if (!parsed.body.toLowerCase().includes(senderName.toLowerCase())) {
        parsed.body += `\n\nBest regards,\n${senderName}`;
      }
    }
    /* ================= END FIX ================= */

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
