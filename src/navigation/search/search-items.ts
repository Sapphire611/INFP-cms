import {
  LayoutDashboard,
  Users,
  UsersRound,
  ShieldCheck,
  MessageSquare,
  Vegan,
  Upload,
  Layers,
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
  { group: "Three.js 演示", icon: Layers, label: "IC载板复判", href: "/demo/threejs/ic" },
  { group: "Three.js 演示", icon: Upload, label: "3D模型导入", href: "/demo/threejs/import" },
  { group: "Three.js 演示", icon: Vegan, label: "简单粒子动画", href: "/demo/threejs/animate" },
];
