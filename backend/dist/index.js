"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_2 = require("./cors");
// Load environment variables FIRST
dotenv_1.default.config();
// Initialize Firebase Admin (may fail if serviceAccount.json is missing, but we'll handle it)
try {
    require("./firebaseAdmin");
    console.log("✅ Firebase Admin initialized");
}
catch (error) {
    console.warn("⚠️  Firebase Admin initialization failed:", error.message);
    console.warn("⚠️  Some features may not work. Make sure serviceAccount.json exists.");
    console.warn("⚠️  Backend will still start, but authentication features won't work.");
}
const audio_route_1 = __importDefault(require("./routes/audio.route"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const user_route_1 = __importDefault(require("./routes/user.route"));
const gemini_route_1 = __importDefault(require("./routes/gemini.route"));
const app = (0, express_1.default)();
// Get PORT from environment (Railway sets this automatically)
// Railway ALWAYS sets PORT, so if it's not set, we're not on Railway
// Default to 5000 only for local development
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
// Validate PORT is a valid number
if (isNaN(PORT) || PORT <= 0) {
    console.error("❌ Invalid PORT value:", process.env.PORT);
    process.exit(1);
}
// Warn if PORT is 5000 in production (Railway never uses 5000)
if (process.env.NODE_ENV === "production" && PORT === 5000 && !process.env.PORT) {
    console.warn("⚠️  WARNING: Running in production but PORT is defaulting to 5000.");
    console.warn("⚠️  Railway should set PORT automatically. Check Railway configuration.");
}
// CORS configuration - using the centralized corsOptions from cors.ts
// This handles multiple origins, Vercel preview deployments, and local development
// The cors() middleware automatically handles OPTIONS preflight requests
app.use((0, cors_1.default)(cors_2.corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Log all requests in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}
// Health check endpoint
app.get("/health", (_req, res) => {
    res.json({ status: "ok", message: "Backend is running" });
});
// Diagnostic endpoint for OAuth configuration
app.get("/api/diagnostics/oauth", (_req, res) => {
    const diagnostics = {
        environment: process.env.NODE_ENV || "development",
        googleOAuth: {
            clientId: process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Missing",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Missing",
            redirectUri: process.env.GOOGLE_REDIRECT_URI || "❌ Missing",
            redirectUriValid: process.env.GOOGLE_REDIRECT_URI
                ? (process.env.GOOGLE_REDIRECT_URI.includes("localhost") && process.env.NODE_ENV === "production" ? "⚠️ Localhost in production" : "✅ Valid")
                : "❌ Not set",
        },
        firebase: {
            serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT ? "✅ Set (JSON string)" :
                (process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? "✅ Set (file path)" : "❌ Missing"),
        },
        gemini: {
            apiKey: process.env.GEMINI_API_KEY ? "✅ Set" : "❌ Missing",
        },
        timestamp: new Date().toISOString(),
    };
    res.json(diagnostics);
});
// Routes
app.use("/api", audio_route_1.default);
app.use("/api/auth", auth_route_1.default);
app.use("/api/user", user_route_1.default);
app.use("/api/gemini", gemini_route_1.default);
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
        success: false,
        message: err.message || "Internal server error",
    });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log("=".repeat(50));
    console.log("✅ Backend server started successfully!");
    console.log("=".repeat(50));
    console.log(`🌐 Server running on: 0.0.0.0:${PORT}`);
    console.log(`📡 PORT from environment: ${process.env.PORT ? process.env.PORT : "not set (using default 5000)"}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`📦 Node version: ${process.version}`);
    console.log(`🌍 Railway detected: ${process.env.RAILWAY_ENVIRONMENT ? "Yes" : "No"}`);
    if (process.env.RAILWAY_ENVIRONMENT) {
        console.log(`🚂 Railway environment: ${process.env.RAILWAY_ENVIRONMENT}`);
    }
    console.log("=".repeat(50));
    // Validate required environment variables
    const requiredEnvVars = [
        "GEMINI_API_KEY",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
    ];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
        console.warn("⚠️  Missing environment variables:", missingVars.join(", "));
        console.warn("Please check your environment variables in Railway dashboard");
    }
    else {
        console.log("✅ All required environment variables are set");
    }
    console.log("=".repeat(50));
    console.log(`🚀 Server is ready to accept connections on port ${PORT}`);
    console.log("=".repeat(50));
});
//# sourceMappingURL=index.js.map