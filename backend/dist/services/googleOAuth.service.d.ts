declare const oauth2Client: import("googleapis-common").OAuth2Client;
export declare const SCOPES: string[];
/**
 * Get authorization URL for OAuth2 flow
 * @param userId - User ID to include in state parameter for callback
 */
export declare function getAuthUrl(userId?: string): string;
/**
 * Exchange authorization code for tokens
 */
export declare function getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expiry_date: number;
}>;
/**
 * Store tokens in Firestore for a user
 */
export declare function storeUserTokens(userId: string, tokens: {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
}): Promise<void>;
/**
 * Get stored tokens for a user
 */
export declare function getUserTokens(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expiry_date: number;
} | null>;
/**
 * Get a valid access token for a user (refresh if needed)
 */
export declare function getValidAccessToken(userId: string): Promise<string>;
/**
 * Get authenticated OAuth2 client for a user
 */
export declare function getAuthenticatedClient(userId: string): Promise<typeof oauth2Client>;
export {};
//# sourceMappingURL=googleOAuth.service.d.ts.map