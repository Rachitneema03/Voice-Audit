import { Request, Response, NextFunction } from "express";
import admin, { adminInitialized } from "../firebaseAdmin";

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

export async function verifyFirebaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!adminInitialized) {
    res.status(503).json({ 
      message: "Firebase Admin not initialized. Please check serviceAccount.json configuration." 
    });
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: "No authorization header provided" });
    return;
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // uid, email available
    next();
  } catch (error) {
    console.error("Firebase token verification error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
