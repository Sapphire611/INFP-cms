import React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ClassWithCallback } from "./types";

export const classColumns: ColumnDef<ClassWithCallback>[] = [
  {
    accessorKey: "name",
    header: "班级名称",
    cell: ({ row }) => {
      const classItem = row.original;
      return (
        <div className="font-medium">
          {classItem.name}
        </div>
      );
    },
  },
  {
    accessorKey: "grade",
    header: "年级",
    cell: ({ row }) => {
      const classItem = row.original;
      return <Badge variant="secondary">{classItem.grade}</Badge>;
    },
  },
  {
    accessorKey: "classCode",
    header: "班级代码",
    cell: ({ row }) => {
      const classItem = row.original;
      return <span className="font-mono text-sm">{classItem.classCode}</span>;
    },
  },
  {
    accessorKey: "teachers",
    header: "班主任",
    cell: ({ row }) => {
      const classItem = row.original;
      const primaryTeacher = classItem.teachers?.find(t => t.isPrimary);

      if (!primaryTeacher || !primaryTeacher.teacher) {
        return <span className="text-muted-foreground">未分配</span>;
      }

      // 类型守卫检查 teacher 是否已填充
      const teacher = primaryTeacher.teacher as any;
      if (typeof teacher === 'object' && teacher && teacher.profile && teacher.profile.name) {
        return <span>{teacher.profile.name}</span>;
      }

      return <span className="text-muted-foreground">未分配</span>;
    },
  },
  {
    accessorKey: "students",
    header: "学生人数",
    cell: ({ row }) => {
      const classItem = row.original;
      const studentCount = classItem.students?.length || 0;
      const capacity = classItem.capacity || 30;
      const isFull = studentCount >= capacity;

      return (
        <div className="flex items-center gap-2">
          <span className={isFull ? "text-destructive font-medium" : ""}>
            {studentCount}/{capacity}
          </span>
          {isFull && <Badge variant="destructive">已满</Badge>}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "状态",
    cell: ({ row }) => {
      const classItem = row.original;
      return (
        <Badge variant={classItem.isActive ? "default" : "secondary"}>
          {classItem.isActive ? "激活" : "未激活"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "操作",
    cell: ({ row }) => {
      const classItem = row.original;
      return (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (classItem.onEdit) {
                classItem.onEdit();
              }
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (confirm("确定要删除这个班级吗？")) {
                try {
                  const response = await fetch(`/api/classes/${classItem._id}`, {
                    method: "DELETE",
                  });

                  if (response.ok) {
                    classItem.onClassUpdated();
                  } else {
                    const error = await response.json();
                    alert(error.error || "删除失败");
                  }
                } catch (error) {
                  console.error("Error deleting class:", error);
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
