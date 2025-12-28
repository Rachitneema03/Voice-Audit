import { Router, Request, Response } from "express";
import { verifyFirebaseToken, AuthenticatedRequest } from "../middlewares/firebaseAuth";
import {
  getAuthUrl,
  getTokensFromCode,
  storeUserTokens,
} from "../services/googleOAuth.service";

const router = Router();

/**
 * GET /api/auth/google/url
 * Get Google OAuth2 authorization URL
 */
router.get(
  "/google/url",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.uid) {
        res.status(401).json({
          success: false,
          message: "User authentication failed",
        });
        return;
      }

      // Pass userId in auth URL state parameter
      const authUrl = getAuthUrl(req.user.uid);
      res.json({
        success: true,
        authUrl,
      });
    } catch (error: any) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate authorization URL",
      });
    }
  }
);

/**
 * GET /api/auth/google/callback
 * Handle OAuth2 callback and store tokens
 */
router.get(
  "/google/callback",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state } = req.query;

      if (!code || typeof code !== "string") {
        res.status(400).json({
          success: false,
          message: "Authorization code is required",
        });
        return;
      }

      console.log("📥 OAuth callback received");
      console.log("   - Code:", code.substring(0, 20) + "...");
      console.log("   - State:", state);

      // Extract userId from state parameter (passed from frontend in auth URL)
      const userId = state as string;

      if (!userId || userId === "default") {
        console.error("❌ Invalid state parameter:", state);
        res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial; padding: 2rem; text-align: center;">
            <h1>❌ Error</h1>
            <p>User ID is required. Please complete OAuth from the app.</p>
            <p>State received: ${state || "none"}</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
          </html>
        `);
        return;
      }

      console.log("   - User ID:", userId);

      // Exchange code for tokens
      let tokens;
      try {
        tokens = await getTokensFromCode(code);
        console.log("✅ Tokens obtained successfully");
      } catch (tokenError: any) {
        console.error("❌ Error getting tokens:", tokenError);
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Authorization Failed</title></head>
          <body style="font-family: Arial; padding: 2rem; text-align: center; background: #fee; color: #c00;">
            <h1>❌ Authorization Failed</h1>
            <p><strong>Error:</strong> ${tokenError.message || "Failed to get tokens"}</p>
            <p style="font-size: 0.9rem; margin-top: 1rem;">Please try again or contact support.</p>
            <script>setTimeout(() => window.close(), 5000);</script>
          </body>
          </html>
        `);
        return;
      }

      // Store tokens in Firestore
      try {
        await storeUserTokens(userId, tokens);
        console.log("✅ Tokens stored in Firestore for user:", userId);
      } catch (storeError: any) {
        console.error("❌ Error storing tokens:", storeError);
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Storage Error</title></head>
          <body style="font-family: Arial; padding: 2rem; text-align: center; background: #fee; color: #c00;">
            <h1>❌ Storage Error</h1>
            <p>Failed to store tokens: ${storeError.message}</p>
            <p style="font-size: 0.9rem;">Please check Firebase configuration.</p>
            <script>setTimeout(() => window.close(), 5000);</script>
          </body>
          </html>
        `);
        return;
      }

      // Return HTML page that closes popup and notifies parent
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            .success {
              font-size: 2rem;
              margin-bottom: 1rem;
            }
            .message {
              font-size: 1.2rem;
              opacity: 0.9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅</div>
            <div class="message">Google account connected successfully!</div>
            <div class="message" style="font-size: 0.9rem; margin-top: 1rem;">This window will close automatically...</div>
          </div>
          <script>
            // Notify parent window
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', userId: '${userId}' }, '*');
            }
            // Close popup after 2 seconds
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Error in OAuth callback:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to complete authorization",
      });
    }
  }
);

export default router;



