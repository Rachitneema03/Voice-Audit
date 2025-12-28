"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCOPES = void 0;
exports.getAuthUrl = getAuthUrl;
exports.getTokensFromCode = getTokensFromCode;
exports.storeUserTokens = storeUserTokens;
exports.getUserTokens = getUserTokens;
exports.getValidAccessToken = getValidAccessToken;
exports.getAuthenticatedClient = getAuthenticatedClient;
const googleapis_1 = require("googleapis");
const firebaseAdmin_1 = __importDefault(require("../firebaseAdmin"));
// Initialize OAuth2 client (with fallback values for testing)
// Create OAuth2Client using the correct googleapis method
const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID || "dummy-client-id", process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret", process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback");
// Scopes required for Calendar, Tasks, and Gmail
exports.SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/gmail.send",
];
/**
 * Get authorization URL for OAuth2 flow
 * @param userId - User ID to include in state parameter for callback
 */
function getAuthUrl(userId) {
    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: exports.SCOPES,
        prompt: "consent", // Force consent to get refresh token
        state: userId || "default", // Pass userId in state for callback
    });
}
/**
 * Exchange authorization code for tokens
 */
async function getTokensFromCode(code) {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
        throw new Error("No refresh token received. User may need to re-authorize.");
    }
    return {
        access_token: tokens.access_token || "",
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date || Date.now(),
    };
}
/**
 * Store tokens in Firestore for a user
 */
async function storeUserTokens(userId, tokens) {
    const db = firebaseAdmin_1.default.firestore();
    await db.collection("userTokens").doc(userId).set({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        updatedAt: firebaseAdmin_1.default.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Get stored tokens for a user
 */
async function getUserTokens(userId) {
    const db = firebaseAdmin_1.default.firestore();
    const doc = await db.collection("userTokens").doc(userId).get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    return {
        access_token: data?.access_token || "",
        refresh_token: data?.refresh_token || "",
        expiry_date: data?.expiry_date || 0,
    };
}
/**
 * Get a valid access token for a user (refresh if needed)
 */
async function getValidAccessToken(userId) {
    const tokens = await getUserTokens(userId);
    if (!tokens) {
        throw new Error("User not authenticated with Google. Please complete OAuth flow.");
    }
    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    if (tokens.expiry_date - now < expiryBuffer) {
        // Token expired or about to expire, refresh it
        oauth2Client.setCredentials({
            refresh_token: tokens.refresh_token,
        });
        const { credentials } = await oauth2Client.refreshAccessToken();
        if (!credentials.access_token) {
            throw new Error("Failed to refresh access token");
        }
        // Update stored tokens
        await storeUserTokens(userId, {
            access_token: credentials.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: credentials.expiry_date || Date.now() + 3600 * 1000,
        });
        return credentials.access_token;
    }
    return tokens.access_token;
}
/**
 * Get authenticated OAuth2 client for a user
 */
async function getAuthenticatedClient(userId) {
    const accessToken = await getValidAccessToken(userId);
    const tokens = await getUserTokens(userId);
    if (!tokens) {
        throw new Error("Failed to get user tokens");
    }
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: tokens.refresh_token,
    });
    return oauth2Client;
}
//# sourceMappingURL=googleOAuth.service.js.map