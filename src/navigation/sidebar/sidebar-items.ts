import { MessageSquare, Users, LayoutDashboard, UsersRound, ShieldCheck, Layers, type LucideIcon } from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "cms",
    items: [
      {
        title: "数据概览",
        url: "/cms/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "用户管理",
        url: "/cms/users",
        icon: Users,
      },
      {
        title: "微信用户",
        url: "/cms/wechat-users",
        icon: UsersRound,
      },
      {
        title: "权限管理",
        url: "/cms/roles",
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: 2,
    label: "demo",
    items: [
      {
        title: "AI对话",
        url: "/demo/chat",
        icon: MessageSquare,
      },
      {
        title: "Three.js 演示",
        url: "/demo/threejs/ic",
        icon: Layers,
        subItems: [
          { title: "IC载板复判", url: "/demo/threejs/ic" },
          { title: "3D模型导入", url: "/demo/threejs/import" },
          { title: "简单粒子动画", url: "/demo/threejs/animate", isNew: true },
        ],
      },
    ],
  },
];
