"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSettings } from "./theme-settings";
import { ChatSearchDialog } from "./chat-search-dialog";
import { AccountSwitcher } from "@/components/sidebar/account-switcher";

export function ChatHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center border-b px-4 bg-background">
      {/* Left: branding */}
      <Link
        href="/chat"
        className="flex items-center gap-2 shrink-0 mr-4"
      >
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">S</span>
        </div>
        <span className="font-semibold text-sm hidden sm:inline">
          Sapphire Studio
        </span>
      </Link>

      {/* Center: search */}
      <div className="flex-1 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          className="max-w-md w-full justify-between text-muted-foreground font-normal border-muted-foreground/20"
          onClick={() => setSearchOpen(true)}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>搜索对话...</span>
          </div>
          <kbd className="hidden sm:inline-flex bg-muted h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium select-none">
            <Command className="h-3 w-3" />
            <span>K</span>
          </kbd>
        </Button>
      </div>

      {/* Right: theme + account */}
      <div className="flex items-center gap-1 ml-4">
        <ThemeSettings />
        <AccountSwitcher />
      </div>

      <ChatSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
