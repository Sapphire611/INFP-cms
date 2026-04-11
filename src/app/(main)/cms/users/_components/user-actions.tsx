"use client";

import * as React from "react";

import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { usePermissions } from "@/hooks/use-permissions";

import { EditUserDialog } from "./edit-user-dialog";
import { UserWithCallback } from "./types";

interface UserActionsProps {
  user: UserWithCallback;
  onUserUpdated?: () => void;
}

export function UserActions({ user, onUserUpdated }: UserActionsProps) {
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission("users", "update");
  const canDelete = hasPermission("users", "delete");

  if (!canUpdate && !canDelete) return null;

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("删除用户成功");
        onUserUpdated?.();
        setIsDeleteOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error ?? "删除用户失败");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("删除用户失败");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">打开菜单</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && (
            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              编辑
            </DropdownMenuItem>
          )}
          {canUpdate && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuItem className="text-red-600" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 编辑用户对话框 */}
      <EditUserDialog user={user} open={isEditOpen} onOpenChange={setIsEditOpen} onUserUpdated={onUserUpdated} />

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除用户</DialogTitle>
            <DialogDescription>
              确定要删除用户"{user.profileName || user.username}"吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
