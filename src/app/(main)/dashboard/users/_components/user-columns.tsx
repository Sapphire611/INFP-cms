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
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{format(new Date(row.original.createdAt), "MMM dd, yyyy")}</span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{format(new Date(row.original.updatedAt), "MMM dd, yyyy")}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <UserActions user={row.original} onUserUpdated={row.original.onUserUpdated} />,
    enableSorting: false,
  },
];
