import { Router, Request, Response } from "express";
import { verifyFirebaseToken } from "../middlewares/firebaseAuth";
import { analyzeText } from "../services/gemini.service";

const router = Router();

/**
 * POST /api/gemini/test
 */
router.post(
  "/test",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { text } = req.body as { text?: string };

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Text input is required",
        });
        return;
      }

      // 🔐 Safely extract username from Firebase middleware
      const userName =
        (req as any).user?.name ||
        (req as any).user?.email?.split("@")[0] ||
        "User";

      console.log("🧪 Gemini input:", text);
      console.log("👤 User:", userName);

      // ✅ SINGLE Gemini call
      const geminiResponse = await analyzeText(text.trim(), userName);

      res.status(200).json({
        success: true,
        message: "Gemini API test successful",
        geminiResponse,
      });
    } catch (error: any) {
      console.error("❌ Gemini API error:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Gemini API test failed",
      });
    }
  }
);

export default router;
