import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { UserWithCallback } from "./types";
import { UserActions } from "./user-actions";

// 用户类型标签颜色映射
const userTypeColors = {
  admin: "default",
  teacher: "secondary",
} as const;

// 用户类型中文映射
const userTypeLabels = {
  admin: "管理员",
  teacher: "教师",
} as const;

// 用户列定义
export const userColumns: ColumnDef<UserWithCallback>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选择行"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "profile.name",
    header: "姓名",
    cell: ({ row }) => <span className="font-medium">{row.original.profile?.name || row.original.username}</span>,
  },
  {
    accessorKey: "userType",
    header: "用户类型",
    cell: ({ row }) => (
      <Badge variant={userTypeColors[row.original.userType]}>
        {userTypeLabels[row.original.userType]}
      </Badge>
    ),
  },
  {
    accessorKey: "email",
    header: "邮箱",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
  },
  {
    accessorKey: "profile.phone",
    header: "联系电话",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.profile?.phone || "-"}</span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "状态",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "destructive"}>
        {row.original.isActive ? "激活" : "禁用"}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "创建时间",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{format(new Date(row.original.createdAt), "yyyy年MM月dd日")}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <UserActions user={row.original} onUserUpdated={row.original.onUserUpdated} />,
    enableSorting: false,
  },
];
