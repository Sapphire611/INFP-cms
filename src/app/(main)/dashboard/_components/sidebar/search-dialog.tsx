"use client";
import * as React from "react";

import { LayoutDashboard, Users, UsersRound, School, GraduationCap, ClipboardList, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const searchItems = [
  { group: "仪表盘", icon: LayoutDashboard, label: "数据概览", href: "/dashboard/default" },
  { group: "用户管理", icon: Users, label: "用户列表", href: "/dashboard/users" },
  { group: "家长管理", icon: UsersRound, label: "家长列表", href: "/dashboard/parents" },
  { group: "班级管理", icon: School, label: "班级列表", href: "/dashboard/classes" },
  { group: "学生管理", icon: GraduationCap, label: "学生列表", href: "/dashboard/students" },
  { group: "学习管理", icon: ClipboardList, label: "学习表现", href: "/dashboard/performance" },
];

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    window.location.href = href;
  };

  return (
    <>
      <Button
        variant="link"
        className="text-muted-foreground !px-0 font-normal hover:no-underline"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        搜索
        <kbd className="bg-muted inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium select-none">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="搜索功能模块、用户、班级等..." />
        <CommandList>
          <CommandEmpty>未找到相关结果</CommandEmpty>
          {[...new Set(searchItems.map((item) => item.group))].map((group, i) => (
            <React.Fragment key={group}>
              {i !== 0 && <CommandSeparator />}
              <CommandGroup heading={group} key={group}>
                {searchItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <CommandItem className="!py-1.5" key={item.label} onSelect={() => handleSelect(item.href)}>
                      {item.icon && <item.icon />}
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
