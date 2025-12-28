"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeAction = routeAction;
const googleCalendar_service_1 = require("./googleCalendar.service");
const googleTasks_service_1 = require("./googleTasks.service");
const googleGmail_service_1 = require("./googleGmail.service");
/**
 * Route Gemini response to appropriate Google service
 */
async function routeAction(userId, geminiResponse) {
    try {
        switch (geminiResponse.action) {
            case "calendar":
                const event = await (0, googleCalendar_service_1.createCalendarEvent)(userId, geminiResponse);
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
                const task = await (0, googleTasks_service_1.createTask)(userId, geminiResponse);
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
                const email = await (0, googleGmail_service_1.sendEmail)(userId, geminiResponse);
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
    }
    catch (error) {
        console.error("Error routing action:", error);
        // Check if it's an OAuth error
        if (error.message?.includes("not authenticated") || error.message?.includes("OAuth")) {
            return {
                success: false,
                action: geminiResponse.action,
                message: "Please authenticate with Google first. Complete the OAuth flow.",
            };
        }
        return {
            success: false,
            action: geminiResponse.action || "unknown",
            message: error.message || "An error occurred while processing the action",
        };
    }
}
//# sourceMappingURL=actionRouter.service.js.map