"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebaseAuth_1 = require("../middlewares/firebaseAuth");
const googleOAuth_service_1 = require("../services/googleOAuth.service");
const router = (0, express_1.Router)();
/**
 * GET /api/user/google-status
 * Check if user has connected Google account
 */
router.get("/google-status", firebaseAuth_1.verifyFirebaseToken, async (req, res) => {
    try {
        if (!req.user?.uid) {
            res.status(401).json({
                success: false,
                message: "User authentication failed",
            });
            return;
        }
        const tokens = await (0, googleOAuth_service_1.getUserTokens)(req.user.uid);
        const isConnected = tokens !== null && tokens.refresh_token !== undefined;
        res.json({
            success: true,
            connected: isConnected,
            isConnected: isConnected, // Also include for compatibility
            message: isConnected ? "Google account connected" : "Google account not connected",
        });
    }
    catch (error) {
        console.error("Error checking Google status:", error);
        res.status(500).json({
            success: false,
            connected: false,
            message: error.message || "Failed to check Google connection status",
        });
    }
});
exports.default = router;
//# sourceMappingURL=user.route.js.map