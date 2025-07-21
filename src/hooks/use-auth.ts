"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 从cookie中获取用户信息
    const getUserFromCookie = () => {
      const userInfoCookie = document.cookie.split("; ").find((row) => row.startsWith("user-info="));

      if (userInfoCookie) {
        try {
          const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.split("=")[1]));
          setUser(userInfo);
        } catch (error) {
          console.error("Error parsing user info:", error);
        }
      }
      setLoading(false);
    };

    getUserFromCookie();
  }, []);

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setUser(null);
        router.push("/login");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return {
    user,
    loading,
    logout,
    isAuthenticated: !!user,
  };
}
