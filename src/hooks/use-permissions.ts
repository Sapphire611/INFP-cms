"use client";

import { useMemo } from "react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  userType?: "admin" | "user";
  permissions?: string[];
}

function getUserInfoFromCookie(): UserInfo | null {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie.split("; ").find((row) => row.startsWith("user-info="));
  if (!cookie) return null;
  try {
    return JSON.parse(decodeURIComponent(cookie.split("=").slice(1).join("=")));
  } catch {
    return null;
  }
}

export function usePermissions() {
  const userInfo = useMemo(() => getUserInfoFromCookie(), []);

  const hasPermission = (module: string, action: string): boolean => {
    if (!userInfo) return false;
    if (userInfo.userType === "admin") return true;
    return (userInfo.permissions ?? []).includes(`${module}:${action}`);
  };

  return { hasPermission };
}
