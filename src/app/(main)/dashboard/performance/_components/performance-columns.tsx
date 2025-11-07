import React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface PerformanceData {
  _id: string;
  studentName: string;
  studentId: string;
  className: string;
  completedLessons: number;
  totalLessons: number;
  totalStars: number;
  learningMinutes: number;
  rating: "优秀" | "良好" | "中等" | "需加油";
}

export const performanceColumns: ColumnDef<PerformanceData>[] = [
  {
    accessorKey: "studentName",
    header: "学生姓名",
    cell: ({ row }) => {
      const data = row.original;
      return (
        <div>
          <div className="font-medium">{data.studentName}</div>
          <div className="text-sm text-muted-foreground">{data.studentId}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "className",
    header: "班级",
    cell: ({ row }) => {
      const data = row.original;
      return <span>{data.className}</span>;
    },
  },
  {
    accessorKey: "completedLessons",
    header: "完成课程",
    cell: ({ row }) => {
      const data = row.original;
      const progress = data.totalLessons > 0 ? (data.completedLessons / data.totalLessons) * 100 : 0;

      return (
        <div className="w-[150px]">
          <div className="mb-1 text-sm font-medium">
            {data.completedLessons}/{data.totalLessons}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      );
    },
  },
  {
    accessorKey: "totalStars",
    header: "获得星星",
    cell: ({ row }) => {
      const data = row.original;
      return (
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">⭐</span>
          <span className="font-medium">{data.totalStars}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "learningMinutes",
    header: "学习时长",
    cell: ({ row }) => {
      const data = row.original;
      const hours = Math.floor(data.learningMinutes / 60);
      const minutes = data.learningMinutes % 60;

      return (
        <span className="text-sm">
          {hours > 0 && `${hours}小时 `}
          {minutes}分钟
        </span>
      );
    },
  },
  {
    accessorKey: "rating",
    header: "表现评级",
    cell: ({ row }) => {
      const data = row.original;
      const ratingConfig = {
        "优秀": { variant: "default" as const, color: "text-green-600" },
        "良好": { variant: "secondary" as const, color: "text-blue-600" },
        "中等": { variant: "outline" as const, color: "text-yellow-600" },
        "需加油": { variant: "destructive" as const, color: "text-red-600" },
      };

      const config = ratingConfig[data.rating] || ratingConfig["中等"];

      return <Badge variant={config.variant}>{data.rating}</Badge>;
    },
  },
  {
    id: "actions",
    header: "操作",
    cell: ({ row }) => {
      const data = row.original;
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // 查看详情
            window.location.href = `/dashboard/students/${data._id}`;
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      );
    },
  },
];
