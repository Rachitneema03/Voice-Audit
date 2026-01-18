import { tasks_v1, google } from "googleapis";
import { getAuthenticatedClient } from "./googleOAuth.service";
import { GeminiResponse } from "./gemini.service";

/**
 * Parse date string for task due date
 * Google Tasks API requires RFC 3339 timestamp format
 * Set to end of day in local timezone
 */
function parseDate(dateString: string): string {
  const now = new Date();
  const lowerDate = dateString.toLowerCase().trim();

  let targetDate: Date;

  // Handle relative dates
  if (lowerDate === "today") {
    targetDate = new Date(now);
    targetDate.setHours(23, 59, 59, 0); // End of today
  } else if (lowerDate === "tomorrow") {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(23, 59, 59, 0); // End of tomorrow
  } else {
    // Try parsing as ISO date string (YYYY-MM-DD)
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      parsedDate.setHours(23, 59, 59, 0); // Set to end of that day
      targetDate = parsedDate;
    } else {
      // If parsing fails, default to end of today
      targetDate = new Date(now);
      targetDate.setHours(23, 59, 59, 0);
    }
  }

  return targetDate.toISOString();
}

/**
 * Get task list ID (use the first available list)
 */
async function getTaskListId(auth: any): Promise<string> {
  try {
    const tasks = google.tasks({ version: "v1", auth });
    const response = await tasks.tasklists.list();

    if (response.data.items && response.data.items.length > 0) {
      // Use the first available task list
      const firstList = response.data.items[0];
      console.log("📋 Using task list:", firstList.title, "(ID:", firstList.id, ")");
      return firstList.id!;
    } else {
      throw new Error("No task lists found for user");
    }
  } catch (error) {
    console.error("❌ Error getting task list:", error);
    // Fallback to default as last resort
    return "@default";
  }
}

/**
 * Create a task
 */
export async function createTask(
  userId: string,
  data: GeminiResponse
): Promise<tasks_v1.Schema$Task> {
  if (data.action !== "task") {
    throw new Error("Invalid action type for tasks service");
  }

  if (!data.title) {
    throw new Error("Task title is required");
  }

  const auth = await getAuthenticatedClient(userId);
  const tasks = google.tasks({ version: "v1", auth: auth as any });

  const taskListId = await getTaskListId(auth);

  const parsedDueDate = data.dueDate ? parseDate(data.dueDate) : undefined;
  console.log("📅 Task due date input:", data.dueDate);
  console.log("📅 Task due date parsed:", parsedDueDate);

  const task: tasks_v1.Schema$Task = {
    title: data.title,
    ...(data.description && data.description.trim() && { notes: data.description.trim() }),
    due: parsedDueDate,
    status: "needsAction",
  };

  console.log("📝 Creating task with data:", JSON.stringify(task, null, 2));

  const response = await tasks.tasks.insert({
    tasklist: taskListId,
    requestBody: task,
  });

  if (!response.data) {
    throw new Error("Failed to create task");
  }

  return response.data;
}



