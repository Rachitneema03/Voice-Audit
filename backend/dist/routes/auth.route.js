"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebaseAuth_1 = require("../middlewares/firebaseAuth");
const googleOAuth_service_1 = require("../services/googleOAuth.service");
const router = (0, express_1.Router)();
/**
 * GET /api/auth/google/url
 * Get Google OAuth2 authorization URL
 */
router.get("/google/url", firebaseAuth_1.verifyFirebaseToken, async (req, res) => {
    try {
        if (!req.user?.uid) {
            res.status(401).json({
                success: false,
                message: "User authentication failed",
            });
            return;
        }
        // Pass userId in auth URL state parameter
        const authUrl = (0, googleOAuth_service_1.getAuthUrl)(req.user.uid);
        res.json({
            success: true,
            authUrl,
        });
    }
    catch (error) {
        console.error("Error generating auth URL:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to generate authorization URL",
        });
    }
});
/**
 * GET /api/auth/google/callback
 * Handle OAuth2 callback and store tokens
 */
router.get("/google/callback", async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || typeof code !== "string") {
            res.status(400).json({
                success: false,
                message: "Authorization code is required",
            });
            return;
        }
        // Exchange code for tokens
        const tokens = await (0, googleOAuth_service_1.getTokensFromCode)(code);
        // Extract userId from state parameter (passed from frontend in auth URL)
        const userId = state;
        if (!userId || userId === "default") {
            res.status(400).json({
                success: false,
                message: "User ID is required. Please complete OAuth from the app.",
            });
            return;
        }
        // Store tokens in Firestore
        await (0, googleOAuth_service_1.storeUserTokens)(userId, tokens);
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
    }
    catch (error) {
        console.error("Error in OAuth callback:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to complete authorization",
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.route.js.map