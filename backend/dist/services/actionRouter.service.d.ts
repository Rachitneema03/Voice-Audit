import { GeminiResponse } from "./gemini.service";
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
export declare function routeAction(userId: string, geminiResponse: GeminiResponse): Promise<ActionResult>;
//# sourceMappingURL=actionRouter.service.d.ts.map