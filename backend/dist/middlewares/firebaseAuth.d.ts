import { Request, Response, NextFunction } from "express";
import admin from "../firebaseAdmin";
export interface AuthenticatedRequest extends Request {
    user?: admin.auth.DecodedIdToken;
}
export declare function verifyFirebaseToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=firebaseAuth.d.ts.map