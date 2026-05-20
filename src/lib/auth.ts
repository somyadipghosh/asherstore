import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "demo_jwt_secret_change_me";

export interface AuthPayload {
  id: string;
  email: string;
  role?: "user" | "admin";
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}
