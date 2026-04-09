/**
 * JWT utility functions for verifying custom JWT tokens
 */

import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

export interface JWTPayload {
  id: string;
  email: string;
  userType: "admin" | "user";
  permissions: string[]; // e.g. ["dashboard:view", "users:view", ...]
  iat: number;
  exp: number;
}

/**
 * Verify JWT token from cookie
 * @returns JWT payload if valid, null otherwise
 */
export async function verifyAuth(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth-token")?.value;

    if (!authToken) {
      return null;
    }

    const secret = process.env.JWT_SECRET ?? "";
    if (!secret) {
      console.error("JWT_SECRET is not set");
      return null;
    }

    const payload = verify(authToken, secret) as JWTPayload;
    return payload;
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

/**
 * Get user ID from verified JWT token
 * @returns User ID if valid, null otherwise
 */
export async function getUserId(): Promise<string | null> {
  const payload = await verifyAuth();
  return payload?.id ?? null;
}

/**
 * Middleware helper to protect API routes
 * @returns JWTPayload if authenticated, throws error otherwise
 */
export async function requireAuth(): Promise<JWTPayload> {
  const payload = await verifyAuth();

  if (!payload) {
    throw new Error("Unauthorized");
  }

  return payload;
}