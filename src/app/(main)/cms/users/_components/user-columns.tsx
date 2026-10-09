import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { UserWithCallback } from "./types";
import { UserActions } from "./user-actions";

// 角色标签调色板 —— 按「权限管理」里的角色顺序取色，保证不同角色颜色不同
const ROLE_BADGE_COLORS = [
  "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  "border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  "border-transparent bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300",
  "border-transparent bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300",
];

/** 角色 id → 标签配色，按传入顺序分配（角色多于调色板长度才回绕） */
export function buildRoleColorMap(roleIds: string[]): Record<string, string> {
  return Object.fromEntries(roleIds.map((id, index) => [id, ROLE_BADGE_COLORS[index % ROLE_BADGE_COLORS.length]]));
}

/** 用户列定义 —— 角色配色依赖角色列表，所以做成工厂 */
export function buildUserColumns(roleColors: Record<string, string>): ColumnDef<UserWithCallback>[] {
  return [
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
      accessorKey: "profileName",
      header: "姓名",
      cell: ({ row }) => <span className="font-medium">{row.original.profileName || row.original.username}</span>,
    },
    {
      accessorKey: "email",
      header: "邮箱",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: "profilePhone",
      header: "联系电话",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.profilePhone || "-"}</span>,
    },
    {
      accessorKey: "roles",
      header: "角色",
      cell: ({ row }) => {
        const roles = row.original.roles ?? [];
        if (row.original.userType === "admin") {
          return <Badge variant="default">超级管理员</Badge>;
        }
        if (roles.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r) => (
              <Badge key={r.id} variant="outline" className={roleColors[r.id]}>
                {r.name}
              </Badge>
            ))}
          </div>
        );
      },
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
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <span className="text-muted-foreground text-sm">
            {!isNaN(date.getTime()) ? format(date, "yyyy年MM月dd日") : "-"}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <UserActions user={row.original} onUserUpdated={row.original.onUserUpdated} />,
      enableSorting: false,
    },
  ];
}
