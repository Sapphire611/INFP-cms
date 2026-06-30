"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

function AdminCmsLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user-info="));
    if (cookie) {
      try {
        const data = JSON.parse(
          decodeURIComponent(cookie.split("=").slice(1).join("="))
        );
        setIsAdmin(data.userType === "admin");
      } catch {
        // ignore
      }
    }
  }, []);

  if (!isAdmin) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href="/cms/dashboard">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
          >
            <LayoutDashboard className="h-5 w-5" />
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">切换到 CMS</TooltipContent>
    </Tooltip>
  );
}

export function IconSidebar() {
  const { user } = useAuth();

  return (
    <div className="w-14 h-full flex flex-col items-center border-r bg-muted/5 py-3 shrink-0">
      {/* Top: CMS link */}
      <div className="flex flex-col items-center gap-1">
        <AdminCmsLink />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: settings */}
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">设置</TooltipContent>
        </Tooltip>

        <Avatar className="h-9 w-9 ring-2 ring-muted">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
