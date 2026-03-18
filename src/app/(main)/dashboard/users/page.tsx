"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus, Search } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { UserResponse } from "@/types/user";

import { AddUserDialog } from "./_components/add-user-dialog";
import { UserWithCallback } from "./_components/types";
import { userColumns } from "./_components/user-columns";

// 定义分页信息接口
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Filters {
  userType?: string;
  search?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithCallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [selectedUserType, setSelectedUserType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // 获取用户数据（支持分页和筛选）
  const fetchUsers = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
      try {
        // 构建查询参数
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("limit", pageSize.toString());

        // 添加筛选条件
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value.toString());
        });

        const response = await fetch(`/api/users?${queryParams.toString()}`);
        if (response.ok) {
          const { data, pagination: newPagination } = await response.json();

          // 为每个用户添加更新回调
          const usersWithCallbacks = data.map((user: UserResponse) => ({
            ...user,
            onUserUpdated: () => fetchUsers(page, pageSize),
          }));

          setUsers(usersWithCallbacks);
          setPagination(newPagination);
        } else {
          console.error("Failed to fetch users");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    // 初始化时获取第一页数据
    fetchUsers(1, pagination.limit);
  }, [fetchUsers, pagination.limit]);

  const handleUserTypeFilterChange = (value: string) => {
    setSelectedUserType(value);
    if (value === "all") {
      setFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters.userType;
        return newFilters;
      });
    } else {
      setFilters((prev) => ({ ...prev, userType: value }));
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setFilters((prev) => ({ ...prev, search: searchTerm.trim() }));
    } else {
      setFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters.search;
        return newFilters;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const table = useDataTableInstance({
    data: users,
    columns: userColumns,
    getRowId: (row) => row.id,
    meta: {
      pagination: {
        pageIndex: 0, // 始终从第一页开始
        pageSize: pagination.limit,
        totalRows: pagination.total,
      },
    },
    defaultPageIndex: 0, // 始终从第一页开始
    defaultPageSize: pagination.limit,
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

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="搜索用户名、姓名或邮箱..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} variant="secondary">
              搜索
            </Button>
          </div>
          <DataTableViewOptions table={table} />
        </div>
        <div className="flex items-center gap-4">
          <div className="w-[200px]">
            <Select value={selectedUserType} onValueChange={handleUserTypeFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="用户类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部用户</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="user">普通用户</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary">{pagination.total} 位用户</Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table} columns={userColumns} />
      </div>

      <DataTablePagination
        table={table}
        currentPage={pagination.page}
        pageSize={pagination.limit}
        totalCount={pagination.total}
        totalPages={pagination.totalPages}
        isLoading={loading}
        onPageChange={async (page) => {
          await fetchUsers(page, pagination.limit);
        }}
        onPageSizeChange={async (newPageSize) => {
          await fetchUsers(1, newPageSize);
        }}
        pageSizeOptions={[10, 20, 30, 50]}
      />

      {/* 添加用户对话框 */}
      <AddUserDialog open={isAddOpen} onOpenChange={setIsAddOpen} onUserAdded={() => fetchUsers(1, pagination.limit)} />
    </div>
  );
}
