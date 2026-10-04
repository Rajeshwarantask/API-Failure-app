import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";

export type AuthenticatedRequest = Request & { userId: string; userEmail?: string };

export async function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const header = request.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!token || !secret) return response.status(401).json({ message: "Authentication required." });
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return response.status(401).json({ message: "Invalid authentication token." });
    request.userId = payload.sub;
    request.userEmail = typeof payload.email === "string" ? payload.email : undefined;
    return next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired authentication token." });
  }
}
