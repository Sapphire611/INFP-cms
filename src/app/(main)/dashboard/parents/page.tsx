"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { ParentResponse } from "@/types/parent";

import { AddParentDialog } from "./_components/add-parent-dialog";
import { EditParentDialog } from "./_components/edit-parent-dialog";

// 定义分页信息接口
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ParentsPage() {
  const [parents, setParents] = useState<ParentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentResponse | null>(null);
  const [deletingParent, setDeletingParent] = useState<ParentResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // 获取家长数据
  const fetchParents = useCallback(async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("limit", pageSize.toString());

      // 添加搜索参数
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }

      const response = await fetch(`/api/parents?${queryParams.toString()}`);
      if (response.ok) {
        const { data, pagination: newPagination } = await response.json();
        setParents(data);
        setPagination(newPagination);
      } else {
        console.error("Failed to fetch parents");
      }
    } catch (error) {
      console.error("Error fetching parents:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchParents(1, pagination.limit);
  }, [fetchParents, pagination.limit]);

  // 删除家长
  const handleDelete = async () => {
    if (!deletingParent) return;

    try {
      const response = await fetch(`/api/parents/${deletingParent._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("删除家长成功");
        fetchParents(pagination.page, pagination.limit);
      } else {
        const error = await response.json();
        toast.error(error.error ?? "删除家长失败");
      }
    } catch (error) {
      console.error("Error deleting parent:", error);
      toast.error("删除家长失败");
    } finally {
      setDeletingParent(null);
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
          <h1 className="text-2xl font-bold">家长管理</h1>
        </div>
        <div className="flex h-64 items-center justify-center">
          <span className="text-muted-foreground">正在加载家长信息...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">家长管理</h1>
            <p className="text-muted-foreground">管理家长账户（不能登录CMS，仅通过微信小程序访问）</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新增家长
          </Button>
        </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索家长姓名或电话..."
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
        <Badge variant="secondary">{pagination.total} 位家长</Badge>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">姓名</th>
                <th className="px-4 py-3 text-left text-sm font-medium">联系电话</th>
                <th className="px-4 py-3 text-left text-sm font-medium">关联学生数</th>
                <th className="px-4 py-3 text-left text-sm font-medium">微信绑定</th>
                <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium">最后登录</th>
                <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {parents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    暂无家长数据
                  </td>
                </tr>
              ) : (
                parents.map((parent) => (
                  <tr key={parent._id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{parent.profile.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {parent.profile.phone || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {parent.children.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="cursor-help">
                              {parent.children.length}人
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <div className="font-semibold">关联学生：</div>
                              {parent.children.map((child: any) => (
                                <div key={child._id} className="text-sm">
                                  • {child.name} ({child.studentId})
                                  {child.class && ` - ${child.class.name}`}
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge variant="outline">0人</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {parent.openid ? (
                        <Badge>已绑定</Badge>
                      ) : (
                        <Badge variant="secondary">未绑定</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={parent.isActive ? "default" : "destructive"}>
                        {parent.isActive ? "激活" : "禁用"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {parent.lastLoginAt
                        ? new Date(parent.lastLoginAt).toLocaleDateString("zh-CN")
                        : "从未登录"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingParent(parent)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingParent(parent)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
          <div className="text-sm text-muted-foreground">
            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => fetchParents(pagination.page - 1, pagination.limit)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchParents(pagination.page + 1, pagination.limit)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 添加家长对话框 */}
      <AddParentDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onParentAdded={() => fetchParents(1, pagination.limit)}
      />

      {/* 编辑家长对话框 */}
      {editingParent && (
        <EditParentDialog
          parent={editingParent}
          open={!!editingParent}
          onOpenChange={(open) => !open && setEditingParent(null)}
          onParentUpdated={() => fetchParents(pagination.page, pagination.limit)}
        />
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deletingParent} onOpenChange={() => setDeletingParent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除家长 {deletingParent?.profile.name} 吗？
              {deletingParent && deletingParent.children.length > 0 && (
                <span className="mt-2 block text-destructive">
                  注意：该家长关联了 {deletingParent.children.length} 名学生，无法删除。请先解除学生关联。
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletingParent ? deletingParent.children.length > 0 : false}
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
