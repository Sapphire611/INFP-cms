"use client";

import * as React from "react";

import { Plus } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { UserResponse } from "@/types/user";

import { AddUserDialog } from "./_components/add-user-dialog";
import { UserWithCallback } from "./_components/types";
import { userColumns } from "./_components/user-columns";

export default function UsersPage() {
  const [users, setUsers] = React.useState<UserWithCallback[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // 获取用户数据
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        // 为每个用户添加更新回调
        const usersWithCallbacks = data.map((user: UserResponse) => ({
          ...user,
          onUserUpdated: fetchUsers,
        }));
        setUsers(usersWithCallbacks);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const table = useDataTableInstance({
    data: users,
    columns: userColumns,
    getRowId: (row) => row.id,
  });

  if (loading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">用户</h1>
        </div>
        <div className="flex h-64 items-center justify-center">
          <span className="text-muted-foreground">正在加载用户...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户</h1>
          <p className="text-muted-foreground">管理应用用户</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增用户
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{users.length} 位用户</Badge>
        </div>
        <DataTableViewOptions table={table} />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table} columns={userColumns} />
      </div>

      <DataTablePagination table={table} />

      {/* 添加用户对话框 */}
      <AddUserDialog open={isAddOpen} onOpenChange={setIsAddOpen} onUserAdded={fetchUsers} />
    </div>
  );
}
