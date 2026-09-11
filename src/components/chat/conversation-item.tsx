/**
 * Conversation item - displays a single conversation in the sidebar
 * Supports inline title editing
 */

"use client";

import { useState, useRef, useEffect } from "react";

import { MessageSquare, Trash2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat";
import type { Conversation } from "@/types/chat";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ConversationItem({ conversation, isActive, onSelect, onDelete }: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateConversationTitle = useChatStore((s) => s.updateConversationTitle);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync external title changes
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(conversation.title);
    }
  }, [conversation.title, isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(conversation.title);
  };

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== conversation.title) {
      updateConversationTitle(conversation.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditTitle(conversation.title);
      setIsEditing(false);
    }
  };

  const handleConfirmDelete = () => {
    setIsConfirmOpen(false);
    onDelete();
  };

  return (
    <>
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-2 rounded-lg p-3 transition-colors",
          "hover:bg-muted/50",
          isActive && "bg-muted",
        )}
        onClick={onSelect}
      >
        <MessageSquare className="text-muted-foreground h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="h-6 px-1 py-0 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="truncate text-sm font-medium">{conversation.title}</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={handleStartEdit}
                title="编辑标题"
              >
                <Pencil className="text-muted-foreground h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="text-muted-foreground text-xs">
            {new Date(conversation.updatedAt).toLocaleDateString("zh-CN", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          title="删除对话"
          onClick={(e) => {
            e.stopPropagation();
            setIsConfirmOpen(true);
          }}
        >
          <Trash2 className="text-destructive h-4 w-4" />
        </Button>
      </div>

      {/* 放在可点击的 div 外面：Dialog 走 portal，但 React 事件仍按组件树冒泡，
          写在里面的话点「取消」会顺带触发 onClick={onSelect} */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除对话</DialogTitle>
            <DialogDescription>
              确定要删除「{conversation.title}」吗？该对话的消息记录会一起删除，无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
