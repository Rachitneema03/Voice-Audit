import admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// Initialize Firebase Admin
let serviceAccount: admin.ServiceAccount | null = null;
let adminInitialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Use environment variable (JSON string)
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Use service account file
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
      path.join(__dirname, "../serviceAccount.json");
    
    if (fs.existsSync(serviceAccountPath)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      } catch (error) {
        console.warn("⚠️  Error reading serviceAccount.json:", error);
        throw new Error("Invalid serviceAccount.json file");
      }
    } else {
      console.warn("⚠️  serviceAccount.json not found at:", serviceAccountPath);
      throw new Error(
        "Firebase service account not found. Please set FIREBASE_SERVICE_ACCOUNT " +
        "environment variable or place serviceAccount.json in the backend directory."
      );
    }
  }

  if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    adminInitialized = true;
  }
} catch (error: any) {
  console.warn("⚠️  Firebase Admin initialization failed:", error.message);
  console.warn("⚠️  Server will start but authentication features won't work.");
  adminInitialized = false;
}

// Export admin (may be uninitialized, but won't crash imports)
export default admin;
export { adminInitialized };
