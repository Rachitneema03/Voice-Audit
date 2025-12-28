import { google } from "googleapis";
import admin from "../firebaseAdmin";

// Initialize OAuth2 client (with fallback values for testing)
// Create OAuth2Client using the correct googleapis method
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || "dummy-client-id",
  process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret",
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback"
);

// Scopes required for Calendar, Tasks, and Gmail
export const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/gmail.send",
];

/**
 * Get authorization URL for OAuth2 flow
 * @param userId - User ID to include in state parameter for callback
 */
export function getAuthUrl(userId?: string): string {
  // Validate OAuth2 client configuration
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === "dummy-client-id") {
    throw new Error("GOOGLE_CLIENT_ID is not configured. Please set it in .env file.");
  }
  
  if (!process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET === "dummy-client-secret") {
    throw new Error("GOOGLE_CLIENT_SECRET is not configured. Please set it in .env file.");
  }

  console.log("🔗 Generating OAuth authorization URL...");
  console.log("   - Client ID:", process.env.GOOGLE_CLIENT_ID.substring(0, 20) + "...");
  console.log("   - Redirect URI:", process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback");
  console.log("   - User ID in state:", userId || "default");
  console.log("   - Scopes:", SCOPES.length, "scopes");

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Required to get refresh token
    scope: SCOPES,
    prompt: "consent", // Force consent screen to get refresh token
    state: userId || "default", // Pass userId in state for callback
  });

  console.log("✅ Authorization URL generated successfully");
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}> {
  try {
    console.log("🔄 Exchanging authorization code for tokens...");
    
    // Validate OAuth2 client configuration
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === "dummy-client-id") {
      throw new Error("GOOGLE_CLIENT_ID is not set. Please configure it in .env file.");
    }
    
    if (!process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET === "dummy-client-secret") {
      throw new Error("GOOGLE_CLIENT_SECRET is not set. Please configure it in .env file.");
    }

    const { tokens } = await oauth2Client.getToken(code);
    
    console.log("✅ Tokens received from Google");
    console.log("   - Has access_token:", !!tokens.access_token);
    console.log("   - Has refresh_token:", !!tokens.refresh_token);
    console.log("   - Expiry date:", tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : "Not set");
    
    if (!tokens.access_token) {
      throw new Error("No access token received from Google. Please try again.");
    }
    
    if (!tokens.refresh_token) {
      console.warn("⚠️  No refresh token received. This might happen if user already authorized before.");
      console.warn("   User may need to revoke access and re-authorize to get refresh token.");
      throw new Error("No refresh token received. Please revoke access in Google Account settings and try again, or ensure 'prompt=consent' is set.");
    }

    const expiryDate = tokens.expiry_date || (Date.now() + 3600 * 1000); // Default 1 hour if not provided

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: expiryDate,
    };
  } catch (error: any) {
    console.error("❌ Error exchanging code for tokens:", error);
    
    // Provide more helpful error messages
    if (error.message?.includes("invalid_grant")) {
      throw new Error("Authorization code expired or already used. Please try connecting Google again.");
    }
    
    if (error.message?.includes("redirect_uri_mismatch")) {
      throw new Error("Redirect URI mismatch. Please check GOOGLE_REDIRECT_URI in .env matches Google Cloud Console settings.");
    }
    
    if (error.message?.includes("invalid_client")) {
      throw new Error("Invalid OAuth client credentials. Please check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file.");
    }
    
    throw error;
  }
}

/**
 * Store tokens in Firestore for a user
 */
export async function storeUserTokens(
  userId: string,
  tokens: { access_token: string; refresh_token: string; expiry_date: number }
): Promise<void> {
  const db = admin.firestore();
  await db.collection("userTokens").doc(userId).set({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Get stored tokens for a user
 */
export async function getUserTokens(userId: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
} | null> {
  const db = admin.firestore();
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
export async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await getUserTokens(userId);
  
  if (!tokens) {
    console.error("❌ No tokens found for user:", userId);
    console.error("   User needs to complete OAuth flow");
    throw new Error("User not authenticated with Google. Please complete OAuth flow.");
  }

  if (!tokens.refresh_token) {
    console.error("❌ No refresh token found for user:", userId);
    console.error("   User needs to re-authorize to get refresh token");
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
export async function getAuthenticatedClient(userId: string): Promise<typeof oauth2Client> {
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

