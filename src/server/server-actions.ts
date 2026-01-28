"use server";

import { cookies } from "next/headers";

import { UserResponse } from "@/types/user";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
}

export async function getUserList({ page = 1, limit = 10 }: GetUsersParams = {}): Promise<
  PaginatedResponse<UserResponse>
> {
  return {
    items: Array(limit)
      .fill(null)
      .map((_, index) => ({
        _id: String((page - 1) * limit + index + 1),
        username: `user${(page - 1) * limit + index + 1}`,
        email: `user${(page - 1) * limit + index + 1}@example.com`,
        userType: "user" as const,
        profile: {
          name: `User ${(page - 1) * limit + index + 1}`,
          phone: "",
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    total: 100,
    page,
    limit,
    totalPages: Math.ceil(100 / limit),
  };
}

export async function getValueFromCookie(key: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(key)?.value;
}

export async function setValueToCookie(
  key: string,
  value: string,
  options: { path?: string; maxAge?: number } = {},
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(key, value, {
    path: options.path ?? "/",
    maxAge: options.maxAge ?? 60 * 60 * 24 * 7, // default: 7 days
  });
}

export async function getPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): Promise<T> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(key);
  const value = cookie ? cookie.value.trim() : undefined;
  return allowed.includes(value as T) ? (value as T) : fallback;
}
