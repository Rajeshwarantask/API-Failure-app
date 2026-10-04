import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";

const supabaseJwks = process.env.SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`))
  : null;

export type AuthenticatedRequest = Request & { userId: string; userEmail?: string; userName?: string };

export async function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const header = request.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!token || (!secret && !supabaseJwks)) return response.status(401).json({ message: "Authentication required." });
  try {
    const { alg } = decodeProtectedHeader(token);
    const key = alg === "HS256" && secret ? new TextEncoder().encode(secret) : supabaseJwks;
    if (!key) return response.status(401).json({ message: "Authentication configuration is incomplete." });
    const { payload } = await jwtVerify(token, key, { algorithms: alg === "HS256" ? ["HS256"] : ["ES256", "RS256"] });
    if (typeof payload.sub !== "string") return response.status(401).json({ message: "Invalid authentication token." });
    request.userId = payload.sub;
    request.userEmail = typeof payload.email === "string" ? payload.email : undefined;
    const metadata = payload.user_metadata;
    request.userName = metadata && typeof metadata === "object" && typeof (metadata as Record<string, unknown>).display_name === "string"
      ? (metadata as Record<string, unknown>).display_name as string
      : undefined;
    return next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired authentication token." });
  }
}
