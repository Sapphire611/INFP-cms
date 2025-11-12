"use client";

import * as React from "react";
import { Plus, X, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Child {
  _id: string;
  name: string;
  studentId: string;
  gender: string;
  birthDate: string;
  avatar?: string;
  class?: {
    _id: string;
    name: string;
    grade: string;
    classCode: string;
  };
}

interface ManageChildrenSectionProps {
  parentId: string;
  children: Child[];
  onChildrenUpdated: () => void;
  onCloseParentDialog?: () => void;
}

export function ManageChildrenSection({
  parentId,
  children,
  onChildrenUpdated,
  onCloseParentDialog,
}: ManageChildrenSectionProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [allStudents, setAllStudents] = React.useState<Child[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedStudent, setSelectedStudent] = React.useState<string>("");
  const [relationship, setRelationship] = React.useState("父亲");
  const [isLoading, setIsLoading] = React.useState(false);

  // 获取所有学生列表
  const fetchAllStudents = React.useCallback(async () => {
    try {
      const response = await fetch("/api/students?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setAllStudents(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }, []);

  React.useEffect(() => {
    if (isAddDialogOpen) {
      fetchAllStudents();
    }
  }, [isAddDialogOpen, fetchAllStudents]);

  // 过滤未关联的学生
  const availableStudents = allStudents.filter(
    (student) => !children.some((child) => child._id === student._id)
  );

  // 搜索过滤
  const filteredStudents = availableStudents.filter(
    (student) =>
      student.name.includes(searchTerm) ||
      student.studentId.includes(searchTerm)
  );

  // 添加关联
  const handleAddChild = async () => {
    if (!selectedStudent) {
      toast.error("请选择学生");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/parents/${parentId}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: selectedStudent,
          relationship,
          isPrimary: false,
        }),
      });

      if (response.ok) {
        toast.success("添加关联成功");
        setIsAddDialogOpen(false);
        setSelectedStudent("");
        setSearchTerm("");
        onChildrenUpdated();
        // 关闭父级编辑家长对话框
        onCloseParentDialog?.();
      } else {
        const error = await response.json();
        toast.error(error.error || "添加关联失败");
      }
    } catch (error) {
      console.error("Error adding child:", error);
      toast.error("添加关联失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 移除关联
  const handleRemoveChild = async (childId: string) => {
    try {
      const response = await fetch(
        `/api/parents/${parentId}/children?childId=${childId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("移除关联成功");
        onChildrenUpdated();
      } else {
        const error = await response.json();
        toast.error(error.error || "移除关联失败");
      }
    } catch (error) {
      console.error("Error removing child:", error);
      toast.error("移除关联失败");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">关联学生</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          添加学生
        </Button>
      </div>

      {children.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            暂无关联学生
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {children.map((child) => (
            <div
              key={child._id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                {child.avatar && (
                  <img
                    src={child.avatar}
                    alt={child.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{child.name}</span>
                    <Badge variant="secondary">{child.gender}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    学号: {child.studentId}
                    {child.class && ` • ${child.class.name}`}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveChild(child._id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 添加学生对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加关联学生</DialogTitle>
            <DialogDescription>
              选择要关联的学生，设置家长关系
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 搜索框 */}
            <Input
              placeholder="搜索学生姓名或学号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* 关系选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">家长关系</label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="父亲">父亲</SelectItem>
                  <SelectItem value="母亲">母亲</SelectItem>
                  <SelectItem value="爷爷">爷爷</SelectItem>
                  <SelectItem value="奶奶">奶奶</SelectItem>
                  <SelectItem value="外公">外公</SelectItem>
                  <SelectItem value="外婆">外婆</SelectItem>
                  <SelectItem value="其他监护人">其他监护人</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 学生列表 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">选择学生</label>
              {filteredStudents.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? "未找到匹配的学生" : "暂无可关联的学生"}
                  </p>
                </div>
              ) : (
                <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-lg border p-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student._id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent ${
                        selectedStudent === student._id ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedStudent(student._id)}
                    >
                      {student.avatar && (
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{student.name}</span>
                          <Badge variant="secondary">{student.gender}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          学号: {student.studentId}
                          {student.class && ` • ${student.class.name}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button onClick={handleAddChild} disabled={isLoading || !selectedStudent}>
                {isLoading ? "添加中..." : "确定添加"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
