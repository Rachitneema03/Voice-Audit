import { Router, Response } from "express";
import { verifyFirebaseToken, AuthenticatedRequest } from "../middlewares/firebaseAuth";
import { getUserTokens } from "../services/googleOAuth.service";

const router = Router();

/**
 * GET /api/user/google-status
 * Check if user has connected Google account
 */
router.get(
  "/google-status",
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

      const tokens = await getUserTokens(req.user.uid);
      
      const isConnected = tokens !== null && tokens.refresh_token !== undefined;
      
      res.json({
        success: true,
        connected: isConnected,
        isConnected: isConnected, // Also include for compatibility
        message: isConnected ? "Google account connected" : "Google account not connected",
      });
    } catch (error: any) {
      console.error("Error checking Google status:", error);
      res.status(500).json({
        success: false,
        connected: false,
        message: error.message || "Failed to check Google connection status",
      });
    }
  }
);

export default router;

