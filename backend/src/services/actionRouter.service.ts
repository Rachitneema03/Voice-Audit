import { GeminiResponse } from "./gemini.service";
import { createCalendarEvent } from "./googleCalendar.service";
import { createTask } from "./googleTasks.service";
import { sendEmail } from "./googleGmail.service";

export interface ActionResult {
  success: boolean;
  action: string;
  message: string;
  data?: any;
  requiresAuth?: boolean;
}

/**
 * Route Gemini response to appropriate Google service
 */
export async function routeAction(
  userId: string,
  geminiResponse: GeminiResponse
): Promise<ActionResult> {
  try {
    switch (geminiResponse.action) {
      case "calendar":
        const event = await createCalendarEvent(userId, geminiResponse);
        return {
          success: true,
          action: "calendar",
          message: "Calendar event created successfully",
          data: {
            id: event.id,
            title: event.summary,
            start: event.start?.dateTime,
            end: event.end?.dateTime,
          },
        };

      case "task":
        const task = await createTask(userId, geminiResponse);
        return {
          success: true,
          action: "task",
          message: "Task created successfully",
          data: {
            id: task.id,
            title: task.title,
            due: task.due,
          },
        };

      case "email":
        const email = await sendEmail(userId, geminiResponse);
        return {
          success: true,
          action: "email",
          message: "Email sent successfully",
          data: {
            id: email.id,
            threadId: email.threadId,
          },
        };

      case "unknown":
        return {
          success: false,
          action: "unknown",
          message: "Could not determine the action from the input. Please be more specific.",
        };

      default:
        return {
          success: false,
          action: geminiResponse.action || "unknown",
          message: `Unknown action type: ${geminiResponse.action}`,
        };
    }
  } catch (error: any) {
    console.error("Error routing action:", error);
    
    // Check if it's an OAuth error
    if (error.message?.includes("not authenticated") || error.message?.includes("OAuth") || error.message?.includes("connect")) {
      const actionType = geminiResponse.action === "calendar" ? "Calendar" : 
                        geminiResponse.action === "task" ? "Tasks" : 
                        geminiResponse.action === "email" ? "Gmail" : "Google services";
      
      return {
        success: false,
        action: geminiResponse.action,
        message: `🔗 Google account not connected. To use ${actionType}, please click the "🔗 Connect Google" button in the sidebar (bottom left) and complete the authorization.`,
        requiresAuth: true,
      };
    }

    return {
      success: false,
      action: geminiResponse.action || "unknown",
      message: error.message || "An error occurred while processing the action",
    };
  }
}




