"use client";

import { useEffect, useState } from "react";

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
  // 必须等挂载后再读 cookie：服务端没有 document，渲染期读会让首屏和 hydration 后的
  // 结果不一致（条件渲染的按钮/菜单会在 hydration 时对不上），所以初始一律按「无权限」。
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    setUserInfo(getUserInfoFromCookie());
  }, []);

  const isSuperAdmin = userInfo?.userType === "admin";

  const hasPermission = (module: string, action: string): boolean => {
    if (!userInfo) return false;
    if (isSuperAdmin) return true;
    return (userInfo.permissions ?? []).includes(`${module}:${action}`);
  };

  return { hasPermission, isSuperAdmin };
}
