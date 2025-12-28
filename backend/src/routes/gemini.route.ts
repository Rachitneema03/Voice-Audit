import { Router, Response } from "express";
import { verifyFirebaseToken, AuthenticatedRequest } from "../middlewares/firebaseAuth";
import { analyzeText } from "../services/gemini.service";

const router = Router();

/**
 * POST /api/gemini/test
 * Test Gemini API directly (for debugging)
 */
router.post(
  "/test",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Text input is required",
        });
        return;
      }

      console.log("🧪 Testing Gemini API with text:", text);

      // Test Gemini directly
      const geminiResponse = await analyzeText(text.trim());

      res.status(200).json({
        success: true,
        message: "Gemini API test successful",
        geminiResponse,
      });
    } catch (error: any) {
      console.error("❌ Gemini API test failed:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Gemini API test failed",
        error: error.toString(),
      });
    }
  }
);

export default router;


