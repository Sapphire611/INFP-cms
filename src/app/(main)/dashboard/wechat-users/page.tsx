"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WechatUserResponse } from "@/types/wechatUser";

import { AddWechatUserDialog } from "./_components/add-wechat-user-dialog";
import { EditWechatUserDialog } from "./_components/edit-wechat-user-dialog";

// 定义分页信息接口
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function WechatUsersPage() {
  const [wechatUsers, setWechatUsers] = useState<WechatUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingWechatUser, setEditingWechatUser] = useState<WechatUserResponse | null>(null);
  const [deletingWechatUser, setDeletingWechatUser] = useState<WechatUserResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // 获取微信用户数据
  const fetchWechatUsers = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("limit", pageSize.toString());

        // 添加搜索参数
        if (searchQuery) {
          queryParams.append("search", searchQuery);
        }

        const response = await fetch(`/api/wechat-users?${queryParams.toString()}`);
        if (response.ok) {
          const { data, pagination: newPagination } = await response.json();
          setWechatUsers(data);
          setPagination(newPagination);
        } else {
          console.error("Failed to fetch wechat users");
        }
      } catch (error) {
        console.error("Error fetching wechat users:", error);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery],
  );

  useEffect(() => {
    fetchWechatUsers(1, pagination.limit);
  }, [fetchWechatUsers, pagination.limit]);

  // 删除微信用户
  const handleDelete = async () => {
    if (!deletingWechatUser) return;

    try {
      const response = await fetch(`/api/wechat-users/${deletingWechatUser._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("删除微信用户成功");
        fetchWechatUsers(pagination.page, pagination.limit);
      } else {
        const error = await response.json();
        toast.error(error.error ?? "删除微信用户失败");
      }
    } catch (error) {
      console.error("Error deleting wechat user:", error);
      toast.error("删除微信用户失败");
    } finally {
      setDeletingWechatUser(null);
    }
  };

  // 搜索处理
  const handleSearch = () => {
    if (searchTerm.trim()) {
      setSearchQuery(searchTerm.trim());
    } else {
      setSearchQuery("");
    }
  };

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (loading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">微信用户管理</h1>
        </div>
        <div className="flex h-64 items-center justify-center">
          <span className="text-muted-foreground">正在加载微信用户信息...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">微信用户管理</h1>
            <p className="text-muted-foreground">管理微信用户账户（不能登录CMS，仅通过微信小程序访问）</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新增微信用户
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="搜索微信用户姓名或电话..."
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
          <Badge variant="secondary">{pagination.total} 位微信用户</Badge>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">姓名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">联系电话</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">微信绑定</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">最后登录</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {wechatUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center text-sm">
                      暂无微信用户数据
                    </td>
                  </tr>
                ) : (
                  wechatUsers.map((wechatUser) => (
                    <tr key={wechatUser._id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{wechatUser.profile.name}</td>
                      <td className="text-muted-foreground px-4 py-3">{wechatUser.profile.phone || "-"}</td>
                      <td className="px-4 py-3">
                        {wechatUser.openid ? <Badge>已绑定</Badge> : <Badge variant="secondary">未绑定</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={wechatUser.isActive ? "default" : "destructive"}>
                          {wechatUser.isActive ? "激活" : "禁用"}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-sm">
                        {wechatUser.lastLoginAt
                          ? new Date(wechatUser.lastLoginAt).toLocaleDateString("zh-CN")
                          : "从未登录"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingWechatUser(wechatUser)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeletingWechatUser(wechatUser)}>
                            <Trash2 className="text-destructive h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => fetchWechatUsers(pagination.page - 1, pagination.limit)}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchWechatUsers(pagination.page + 1, pagination.limit)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 添加微信用户对话框 */}
        <AddWechatUserDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onWechatUserAdded={() => fetchWechatUsers(1, pagination.limit)}
        />

        {/* 编辑微信用户对话框 */}
        {editingWechatUser && (
          <EditWechatUserDialog
            wechatUser={editingWechatUser}
            open={!!editingWechatUser}
            onOpenChange={(open) => !open && setEditingWechatUser(null)}
            onWechatUserUpdated={() => fetchWechatUsers(pagination.page, pagination.limit)}
          />
        )}

        {/* 删除确认对话框 */}
        <AlertDialog open={!!deletingWechatUser} onOpenChange={() => setDeletingWechatUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除微信用户 {deletingWechatUser?.profile.name} 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
