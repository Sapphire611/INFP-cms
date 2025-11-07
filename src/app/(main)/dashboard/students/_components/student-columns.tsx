import React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, Eye, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { StudentWithCallback } from "./types";

export const studentColumns: ColumnDef<StudentWithCallback>[] = [
  {
    accessorKey: "name",
    header: "学生信息",
    cell: ({ row }) => {
      const student = row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            {student.avatar ? (
              <img src={student.avatar} alt={student.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-medium">{student.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="font-medium">{student.name}</div>
            <div className="text-sm text-muted-foreground">{student.studentId}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "class",
    header: "班级",
    cell: ({ row }) => {
      const student = row.original;
      const classInfo = student.class;

      if (!classInfo) {
        return <span className="text-muted-foreground">未分配</span>;
      }

      // 类型守卫检查 class 是否已填充
      if (typeof classInfo === 'object' && 'name' in classInfo) {
        const classData = classInfo as any;
        return (
          <div>
            <div>{String(classData.name || "")}</div>
            {classData.grade && (
              <Badge variant="secondary" className="mt-1">
                {String(classData.grade)}
              </Badge>
            )}
          </div>
        );
      }

      return <span className="text-muted-foreground">未分配</span>;
    },
  },
  {
    accessorKey: "age",
    header: "年龄",
    cell: ({ row }) => {
      const student = row.original;
      return <span>{student.age} 岁</span>;
    },
  },
  {
    accessorKey: "learningProgress",
    header: "学习进度",
    cell: ({ row }) => {
      const student = row.original;
      const { completedLessons, totalLessons } = student.learningProgress;
      const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      return (
        <div className="w-[150px]">
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-2" />
            <span className="text-sm text-muted-foreground">
              {completedLessons}/{totalLessons}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "totalStars",
    header: "获得星星",
    cell: ({ row }) => {
      const student = row.original;
      return (
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">⭐</span>
          <span className="font-medium">{student.learningProgress.totalStars}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "enrollment.status",
    header: "状态",
    cell: ({ row }) => {
      const student = row.original;
      const status = student.enrollment.status;

      const statusConfig = {
        "在读": { variant: "default" as const, label: "在读" },
        "休学": { variant: "secondary" as const, label: "休学" },
        "转学": { variant: "outline" as const, label: "转学" },
        "毕业": { variant: "secondary" as const, label: "毕业" },
      };

      const config = statusConfig[status] || statusConfig["在读"];

      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
  },
  {
    id: "actions",
    header: "操作",
    cell: ({ row }) => {
      const student = row.original;
      return (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // 查看详情
              window.location.href = `/dashboard/students/${student._id}`;
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (student.onEdit) {
                student.onEdit();
              }
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (confirm("确定要删除这个学生吗？")) {
                try {
                  const response = await fetch(`/api/students/${student._id}`, {
                    method: "DELETE",
                  });

                  if (response.ok) {
                    student.onStudentUpdated();
                  } else {
                    const error = await response.json();
                    alert(error.error || "删除失败");
                  }
                } catch (error) {
                  console.error("Error deleting student:", error);
                  alert("删除失败，请重试");
                }
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
