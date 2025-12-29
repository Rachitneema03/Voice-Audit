import { Router, Response } from "express";
import { verifyFirebaseToken, AuthenticatedRequest } from "../middlewares/firebaseAuth";
import { analyzeText } from "../services/gemini.service";
import { routeAction, routeMultipleActions } from "../services/actionRouter.service";

const router = Router();

/**
 * POST /api/process
 * Process text input from frontend and execute action
 */
router.post(
  "/process",
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

      if (!req.user?.uid) {
        res.status(401).json({
          success: false,
          message: "User authentication failed",
        });
        return;
      }

      // Analyze text with Gemini
      console.log("📝 Processing text with Gemini:", text.trim());
      let geminiResponse;
      try {
        geminiResponse = await analyzeText(text.trim());
        console.log("✅ Gemini response received:", geminiResponse);
      } catch (geminiError: any) {
        console.error("❌ Gemini API Error:", geminiError);
        res.status(500).json({
          success: false,
          message: `Gemini API Error: ${geminiError.message || "Failed to process text"}`,
          error: "GEMINI_ERROR",
        });
        return;
      }

      // Check if multiple actions are requested
      if (geminiResponse.actions && Array.isArray(geminiResponse.actions) && geminiResponse.actions.length > 0) {
        console.log(`🔄 Routing ${geminiResponse.actions.length} action(s)`);
        const multiResult = await routeMultipleActions(req.user.uid, geminiResponse.actions);
        console.log(`✅ Multi-action result: ${multiResult.successfulActions}/${multiResult.totalActions} successful`);

        if (multiResult.success) {
          res.status(200).json(multiResult);
        } else {
          res.status(400).json(multiResult);
        }
      } else {
        // Single action
        if (!geminiResponse.action) {
          res.status(400).json({
            success: false,
            message: "No action detected in the input. Please be more specific.",
          });
          return;
        }

        console.log("🔄 Routing action:", geminiResponse.action);
        const result = await routeAction(req.user.uid, geminiResponse);
        console.log("✅ Action result:", result.success ? "Success" : "Failed");

        if (result.success) {
          res.status(200).json(result);
        } else {
          res.status(400).json(result);
        }
      }
    } catch (error: any) {
      console.error("Error processing request:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
);

export default router;



