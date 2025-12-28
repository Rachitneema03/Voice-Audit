"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCalendarEvent = createCalendarEvent;
const googleapis_1 = require("googleapis");
const googleOAuth_service_1 = require("./googleOAuth.service");
/**
 * Parse date string (supports relative dates like "tomorrow", "next Monday")
 */
function parseDate(dateString) {
    const now = new Date();
    const lowerDate = dateString.toLowerCase().trim();
    // Handle relative dates
    if (lowerDate === "today") {
        return new Date(now.setHours(0, 0, 0, 0));
    }
    if (lowerDate === "tomorrow") {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return new Date(tomorrow.setHours(0, 0, 0, 0));
    }
    if (lowerDate.startsWith("next ")) {
        // Simple implementation - can be enhanced
        const daysToAdd = 7;
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + daysToAdd);
        return new Date(nextWeek.setHours(0, 0, 0, 0));
    }
    // Try parsing as ISO date
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }
    // Default to today if parsing fails
    return new Date(now.setHours(0, 0, 0, 0));
}
/**
 * Parse time string (HH:MM format) and combine with date
 */
function parseDateTime(date, timeString) {
    const result = new Date(date);
    if (timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
            result.setHours(hours, minutes, 0, 0);
        }
    }
    return result;
}
/**
 * Create a calendar event
 */
async function createCalendarEvent(userId, data) {
    if (data.action !== "calendar") {
        throw new Error("Invalid action type for calendar service");
    }
    if (!data.title) {
        throw new Error("Event title is required");
    }
    const auth = await (0, googleOAuth_service_1.getAuthenticatedClient)(userId);
    const calendar = googleapis_1.google.calendar({ version: "v3", auth: auth });
    // Parse date and time
    const eventDate = data.date ? parseDate(data.date) : new Date();
    const startDateTime = parseDateTime(eventDate, data.time);
    // Calculate end time (default 1 hour if duration not specified)
    const duration = data.duration || 60; // minutes
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
    const event = {
        summary: data.title,
        description: data.description || "",
        start: {
            dateTime: startDateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
            dateTime: endDateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        location: data.location || "",
    };
    const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
    });
    if (!response.data) {
        throw new Error("Failed to create calendar event");
    }
    return response.data;
}
//# sourceMappingURL=googleCalendar.service.js.map