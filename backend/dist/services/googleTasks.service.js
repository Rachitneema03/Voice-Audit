"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTask = createTask;
const googleapis_1 = require("googleapis");
const googleOAuth_service_1 = require("./googleOAuth.service");
/**
 * Parse date string for task due date
 */
function parseDate(dateString) {
    const now = new Date();
    const lowerDate = dateString.toLowerCase().trim();
    // Handle relative dates
    if (lowerDate === "today") {
        return now.toISOString().split("T")[0];
    }
    if (lowerDate === "tomorrow") {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split("T")[0];
    }
    // Try parsing as ISO date
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
    }
    // Default to today if parsing fails
    return now.toISOString().split("T")[0];
}
/**
 * Get task list ID (use default "@default" list)
 */
async function getTaskListId(auth) {
    const tasks = googleapis_1.google.tasks({ version: "v1", auth });
    const response = await tasks.tasklists.list();
    // Use the default task list
    const defaultList = response.data.items?.find((list) => list.id === "@default");
    return defaultList?.id || "@default";
}
/**
 * Create a task
 */
async function createTask(userId, data) {
    if (data.action !== "task") {
        throw new Error("Invalid action type for tasks service");
    }
    if (!data.title) {
        throw new Error("Task title is required");
    }
    const auth = await (0, googleOAuth_service_1.getAuthenticatedClient)(userId);
    const tasks = googleapis_1.google.tasks({ version: "v1", auth: auth });
    const taskListId = await getTaskListId(auth);
    const task = {
        title: data.title,
        notes: data.description || "",
        due: data.dueDate ? parseDate(data.dueDate) : undefined,
        status: "needsAction",
    };
    const response = await tasks.tasks.insert({
        tasklist: taskListId,
        requestBody: task,
    });
    if (!response.data) {
        throw new Error("Failed to create task");
    }
    return response.data;
}
//# sourceMappingURL=googleTasks.service.js.map