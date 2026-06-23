import {
  LayoutDashboard,
  Users,
  UsersRound,
  ShieldCheck,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export interface SearchItem {
  group: string;
  icon: LucideIcon;
  label: string;
  href: string;
}

export const searchItems: SearchItem[] = [
  { group: "仪表盘", icon: LayoutDashboard, label: "数据概览", href: "/cms/dashboard" },
  { group: "用户管理", icon: Users, label: "用户列表", href: "/cms/users" },
  { group: "微信用户", icon: UsersRound, label: "微信用户列表", href: "/cms/wechat-users" },
  { group: "权限管理", icon: ShieldCheck, label: "权限管理", href: "/cms/roles" },
  { group: "AI对话", icon: MessageSquare, label: "AI对话", href: "/demo/chat" },
];
