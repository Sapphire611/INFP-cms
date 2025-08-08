import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Checkbox } from "@/components/ui/checkbox";

import { UserWithCallback } from "./types";
import { UserActions } from "./user-actions";

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
    accessorKey: "name",
    header: "姓名",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: "邮箱",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
  },
  {
    accessorKey: "createdAt",
    header: "创建时间",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{format(new Date(row.original.createdAt), "yyyy年MM月dd日")}</span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "更新时间",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{format(new Date(row.original.updatedAt), "yyyy年MM月dd日")}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <UserActions user={row.original} onUserUpdated={row.original.onUserUpdated} />,
    enableSorting: false,
  },
];
