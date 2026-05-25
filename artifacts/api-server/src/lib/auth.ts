import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JWT_SECRET, JWT_TTL_SECONDS } from "./env";

export type JwtPayload = {
  sub: number; // auth_users.id
  tid: number; // tenants.id
  tk: string; // tenants.tenant_key
  role: "admin" | "company";
};

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: JWT_TTL_SECONDS,
  });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string") return null;
    return decoded as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
