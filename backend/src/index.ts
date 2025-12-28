import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config();

// Initialize Firebase Admin (may fail if serviceAccount.json is missing, but we'll handle it)
try {
  require("./firebaseAdmin");
  console.log("✅ Firebase Admin initialized");
} catch (error: any) {
  console.warn("⚠️  Firebase Admin initialization failed:", error.message);
  console.warn("⚠️  Some features may not work. Make sure serviceAccount.json exists.");
  console.warn("⚠️  Backend will still start, but authentication features won't work.");
}

import audioRoute from "./routes/audio.route";
import authRoute from "./routes/auth.route";
import userRoute from "./routes/user.route";
import geminiRoute from "./routes/gemini.route";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "Backend is running" });
});

// Routes
app.use("/api", audioRoute);
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/gemini", geminiRoute);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  
  // Validate required environment variables
  const requiredEnvVars = [
    "GEMINI_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ];
  
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );
  
  if (missingVars.length > 0) {
    console.warn("⚠️  Missing environment variables:", missingVars.join(", "));
    console.warn("Please check your .env file");
  }
});
