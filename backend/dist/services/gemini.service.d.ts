export interface GeminiResponse {
    action: "calendar" | "task" | "email" | "unknown";
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
export declare function analyzeText(text: string): Promise<GeminiResponse>;
//# sourceMappingURL=gemini.service.d.ts.map