import { type Request, type Response, type NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { verifyJwt, type JwtPayload } from "../lib/auth";
import { ADMIN_API_KEY } from "../lib/env";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export function requireJwt(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  // Allow token via query for SSE / WebSocket upgrade contexts.
  const token = match?.[1] || (req.query["token"] as string | undefined);
  if (!token) {
    res.status(401).json({ detail: "Missing bearer token" });
    return;
  }
  const payload = verifyJwt(token);
  if (!payload) {
    res.status(401).json({ detail: "Invalid or expired token" });
    return;
  }
  req.auth = payload;
  next();
}

export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const provided = (req.headers["x-admin-key"] as string | undefined) || "";
  const expected = ADMIN_API_KEY;
  // Pad both to the same length before comparing so timingSafeEqual never
  // short-circuits on a length mismatch, preserving the constant-time guarantee.
  const maxLen = Math.max(Buffer.byteLength(provided), Buffer.byteLength(expected));
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  a.write(provided);
  b.write(expected);
  if (!timingSafeEqual(a, b)) {
    res.status(401).json({ detail: "Invalid admin key" });
    return;
  }
  next();
}
