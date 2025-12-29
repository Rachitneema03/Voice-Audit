import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface GeminiResponse {
  action?: "calendar" | "task" | "email" | "unknown"; // Single action
  actions?: GeminiResponse[]; // Multiple actions
  title?: string;
  description?: string;
  date?: string; // ISO date string or relative date
  time?: string; // Time in HH:MM format
  duration?: number; // Duration in minutes (for calendar events)
  location?: string; // For calendar events
  recipient?: string; // Email address for email action
  subject?: string; // Email subject
  body?: string; // Email body
  dueDate?: string; // For tasks
  priority?: "low" | "medium" | "high"; // For tasks
}

export async function analyzeText(text: string): Promise<GeminiResponse> {
  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error("❌ GEMINI_API_KEY is not set or empty");
    throw new Error("GEMINI_API_KEY is not set in .env file. Please add it to continue.");
  }

  console.log("🔍 Calling Gemini API with text:", text.substring(0, 50) + "...");
  console.log("🔑 API Key present:", apiKey ? "Yes (length: " + apiKey.length + ")" : "No");

  // Use gemini-2.5-flash (fastest) or gemini-2.5-pro (more capable)
  // Older models (gemini-pro, gemini-1.5-*) are not available in current API
  let model;
  try {
    // Try gemini-2.5-flash first (fastest and most cost-effective)
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("✅ Using model: gemini-2.5-flash");
  } catch (error) {
    try {
      // Fallback to gemini-pro-latest (always available)
      model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });
      console.log("✅ Using model: gemini-pro-latest");
    } catch (error2) {
      try {
        // Try gemini-2.5-pro (more capable)
        model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        console.log("✅ Using model: gemini-2.5-pro");
      } catch (error3) {
        // Last resort: gemini-flash-latest
        console.warn("⚠️ Trying gemini-flash-latest as last resort");
        model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        console.log("✅ Using model: gemini-flash-latest");
      }
    }
  }

  const prompt = `You are a smart assistant that extracts structured information from user commands.

User input: "${text}"

CRITICAL: You MUST return ONLY a valid JSON object. No markdown, no code blocks, no explanations, no extra text. Just the JSON.

IMPORTANT: If the user asks for MULTIPLE actions in one command (e.g., "schedule a meeting and send an email"), return an array of actions in the "actions" field. Otherwise, return a single action in the "action" field.

Rules:
1. If it's about scheduling a meeting/event/appointment → action: "calendar"
2. If it's about creating a task/todo/reminder → action: "task"  
3. If it's about sending an email/message → action: "email"
4. Otherwise → action: "unknown"

For CALENDAR events, extract:
- title: Main event name (e.g., "Meeting", "Meet")
- date: Convert to format like "2024-12-31" or "tomorrow" 
- time: Convert to 24-hour format like "17:00" (5pm = 17:00, 2pm = 14:00)
- duration: Default 60 minutes if not specified
- description: Any additional details
- location: Event location if mentioned

For TASKS, extract:
- title: Task name
- dueDate: Date in format "YYYY-MM-DD" or relative like "tomorrow"
- priority: "low", "medium", or "high"
- description: Task details

For EMAIL, extract:
- recipient: Email address
- subject: Email subject
- body: Email content

Examples:
Single action: "the meet will be on 31 dec 5 pm"
Output: {"action":"calendar","title":"Meet","date":"2024-12-31","time":"17:00","duration":60}

Multiple actions: "schedule a meeting tomorrow at 3pm and send an email to john@example.com about the project"
Output: {"actions":[{"action":"calendar","title":"Meeting","date":"tomorrow","time":"15:00","duration":60},{"action":"email","recipient":"john@example.com","subject":"Project Update","body":"Regarding the project"}]}

Now process this input: "${text}"

Return ONLY the JSON object, nothing else.`;

  let result: any = null;
  try {
    console.log("📤 Sending request to Gemini API...");
    result = await model.generateContent(prompt);
    
    if (!result || !result.response) {
      throw new Error("Gemini API returned empty response");
    }
    
    const responseText = result.response.text();
    
    if (!responseText || responseText.trim() === "") {
      throw new Error("Gemini API returned empty text");
    }
    
    console.log("📥 Gemini raw response:", responseText); // Debug log
    console.log("📥 Response length:", responseText.length);
    
    // Clean the response - remove markdown code blocks if present
    let cleanedText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    // Extract JSON object if there's extra text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }
    
    console.log("🧹 Cleaned text:", cleanedText);
    
    let parsed: GeminiResponse;
    try {
      parsed = JSON.parse(cleanedText) as GeminiResponse;
      console.log("✅ Parsed JSON successfully:", parsed);
    } catch (parseError: any) {
      console.error("❌ JSON Parse Error:", parseError.message);
      console.error("❌ Text that failed to parse:", cleanedText);
      throw new Error(`Failed to parse JSON: ${parseError.message}`);
    }
    
    // Validate the response has at least an action or actions array
    if (!parsed.action && !parsed.actions) {
      console.error("❌ Parsed response missing 'action' or 'actions' field:", parsed);
      throw new Error("Gemini response missing 'action' or 'actions' field");
    }
    
    // If actions array exists, validate it
    if (parsed.actions && Array.isArray(parsed.actions)) {
      console.log(`✅ Gemini analysis complete. Found ${parsed.actions.length} action(s)`);
      for (const action of parsed.actions) {
        if (!action.action) {
          throw new Error("One or more actions in the array is missing the 'action' field");
        }
      }
    } else {
      console.log("✅ Gemini analysis complete. Action:", parsed.action);
    }
    
    return parsed;
  } catch (error: any) {
    console.error("❌ Gemini API Error:", error);
    console.error("❌ Error type:", error.constructor.name);
    console.error("❌ Error message:", error.message);
    
    if (result) {
      console.error("📥 Raw Gemini response:", result.response?.text());
    } else {
      console.error("❌ No result object - API call may have failed");
    }
    
    // Check for specific Gemini API errors
    if (error.message?.includes("API key")) {
      throw new Error("Invalid or missing Gemini API key. Please check your GEMINI_API_KEY in .env file.");
    }
    
    if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
      throw new Error("Gemini API quota exceeded. Please check your API usage limits.");
    }
    
    if (error.message?.includes("model")) {
      throw new Error("Gemini model not available. Please check your API access.");
    }
    
    // Try to extract basic info from the text as fallback
    const lowerText = text.toLowerCase();
    let fallbackAction: "calendar" | "task" | "email" | "unknown" = "unknown";
    
    if (lowerText.includes("meeting") || lowerText.includes("meet") || lowerText.includes("schedule") || lowerText.includes("event")) {
      fallbackAction = "calendar";
    } else if (lowerText.includes("task") || lowerText.includes("todo") || lowerText.includes("remind")) {
      fallbackAction = "task";
    } else if (lowerText.includes("email") || lowerText.includes("send") || lowerText.includes("mail")) {
      fallbackAction = "email";
    }
    
    // Return a fallback response instead of throwing
    return {
      action: fallbackAction,
      title: text.substring(0, 50), // Use first 50 chars as title
      description: "Parsing failed, but action detected. Please provide more details."
    } as GeminiResponse;
  }
}
