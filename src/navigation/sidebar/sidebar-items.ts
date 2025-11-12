import {
  ShoppingBag,
  Forklift,
  Mail,
  MessageSquare,
  Calendar,
  Kanban,
  ReceiptText,
  Users,
  Lock,
  Fingerprint,
  SquareArrowUpRight,
  LayoutDashboard,
  ChartBar,
  Banknote,
  Gauge,
  GraduationCap,
  Clapperboard,
  School,
  Baby,
  UserCog,
  TrendingUp,
  UsersRound,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

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
    label: "幼儿园管理",
    items: [
      {
        title: "仪表盘",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        title: "班级列表",
        url: "/dashboard/classes",
        icon: School,
      },
      {
        title: "学生列表",
        url: "/dashboard/students",
        icon: Baby,
      },
      {
        title: "家长管理",
        url: "/dashboard/parents",
        icon: UsersRound,
      },
      {
        title: "课程管理",
        url: "/dashboard/courses",
        icon: BookOpen,
      },
      {
        title: "用户管理",
        url: "/dashboard/users",
        icon: Users,
      },
      {
        title: "学习表现",
        url: "/dashboard/performance",
        icon: TrendingUp,
      },
      // {
      //   title: "Finance",
      //   url: "/dashboard/finance",
      //   icon: Banknote,
      // },

      // {
      //   title: "Authentication",
      //   url: "/auth",
      //   icon: Fingerprint,
      //   subItems: [
      //     { title: "Login v1", url: "/auth/v1/login", newTab: true },
      //     { title: "Login v2", url: "/auth/v2/login", newTab: true },
      //     { title: "Register v1", url: "/auth/v1/register", newTab: true },
      //     { title: "Register v2", url: "/auth/v2/register", newTab: true },
      //   ],
      // },
      // {
      //   title: "Analytics",
      //   url: "/dashboard/analytics",
      //   icon: Gauge,
      //   comingSoon: true,
      // },
      // {
      //   title: "E-commerce",
      //   url: "/dashboard/e-commerce",
      //   icon: ShoppingBag,
      //   comingSoon: true,
      // },
      // {
      //   title: "Academy",
      //   url: "/dashboard/academy",
      //   icon: GraduationCap,
      //   comingSoon: true,
      // },
      // {
      //   title: "Logistics",
      //   url: "/dashboard/logistics",
      //   icon: Forklift,
      //   comingSoon: true,
      // },
    ],
  },
  // {
  //   id: 2,
  //   label: "Pages",
  //   items: [
  //     {
  //       title: "Email",
  //       url: "/mail",
  //       icon: Mail,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Chat",
  //       url: "/chat",
  //       icon: MessageSquare,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Calendar",
  //       url: "/calendar",
  //       icon: Calendar,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Kanban",
  //       url: "/kanban",
  //       icon: Kanban,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Invoice",
  //       url: "/invoice",
  //       icon: ReceiptText,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Roles",
  //       url: "/roles",
  //       icon: Lock,
  //       comingSoon: true,
  //     },
  //   ],
  // },
  // {
  //   id: 3,
  //   label: "Misc",
  //   items: [
  //     {
  //       title: "Others",
  //       url: "/others",
  //       icon: SquareArrowUpRight,
  //       comingSoon: true,
  //     },
  //   ],
  // },
];
