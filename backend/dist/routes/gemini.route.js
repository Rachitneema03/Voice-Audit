"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebaseAuth_1 = require("../middlewares/firebaseAuth");
const gemini_service_1 = require("../services/gemini.service");
const router = (0, express_1.Router)();
/**
 * POST /api/gemini/test
 * Test Gemini API directly (for debugging)
 */
router.post("/test", firebaseAuth_1.verifyFirebaseToken, async (req, res) => {
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
        const geminiResponse = await (0, gemini_service_1.analyzeText)(text.trim());
        res.status(200).json({
            success: true,
            message: "Gemini API test successful",
            geminiResponse,
        });
    }
    catch (error) {
        console.error("❌ Gemini API test failed:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Gemini API test failed",
            error: error.toString(),
        });
    }
});
exports.default = router;
//# sourceMappingURL=gemini.route.js.map