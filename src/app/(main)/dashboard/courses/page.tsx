"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CourseFormDialog } from "./_components/course-form-dialog";

interface Course {
  _id: string;
  title: string;
  description: string;
  level: string;
  targetGrades: string[];
  sequence: {
    unit: number;
    lesson: number;
    order: number;
  };
  metadata: {
    theme: string;
    code: string;
  };
  difficulty: number;
  estimatedDuration: number;
  isActive: boolean;
  createdAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // 获取课程列表
  const fetchCourses = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("limit", pageSize.toString());

        if (searchQuery) {
          queryParams.append("search", searchQuery);
        }
        if (levelFilter !== "all") {
          queryParams.append("level", levelFilter);
        }
        if (gradeFilter !== "all") {
          queryParams.append("grade", gradeFilter);
        }

        const response = await fetch(`/api/courses?${queryParams.toString()}`);
        if (response.ok) {
          const { data, pagination: newPagination } = await response.json();
          setCourses(data);
          setPagination(newPagination);
        } else {
          console.error("Failed to fetch courses");
          toast.error("获取课程列表失败");
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast.error("获取课程列表失败");
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, levelFilter, gradeFilter]
  );

  useEffect(() => {
    fetchCourses(1, pagination.limit);
  }, [fetchCourses, pagination.limit]);

  // 删除课程
  const handleDelete = async () => {
    if (!deletingCourse) return;

    try {
      const response = await fetch(`/api/courses/${deletingCourse._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("删除课程成功");
        fetchCourses(pagination.page, pagination.limit);
      } else {
        const error = await response.json();
        toast.error(error.error ?? "删除课程失败");
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("删除课程失败");
    } finally {
      setDeletingCourse(null);
    }
  };

  // 搜索处理
  const handleSearch = () => {
    setSearchQuery(searchTerm.trim());
  };

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 打开新增课程表单
  const handleAddCourse = () => {
    setEditingCourse(null);
    setFormOpen(true);
  };

  // 打开编辑课程表单
  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setFormOpen(true);
  };

  // 表单成功后刷新列表
  const handleFormSuccess = () => {
    fetchCourses(pagination.page, pagination.limit);
  };

  // 获取等级徽章颜色
  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "Beginner":
        return "default";
      case "Elementary":
        return "secondary";
      case "Intermediate":
        return "outline";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">课程管理</h1>
        </div>
        <div className="flex h-64 items-center justify-center">
          <span className="text-muted-foreground">正在加载课程信息...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">课程管理</h1>
          <p className="text-muted-foreground">管理教学课程内容</p>
        </div>
        <Button onClick={handleAddCourse}>
          <Plus className="mr-2 h-4 w-4" />
          新增课程
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索课程名称、主题..."
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

        <div className="flex items-center gap-4">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="等级筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部等级</SelectItem>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Elementary">Elementary</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
            </SelectContent>
          </Select>

          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="年级筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部年级</SelectItem>
              <SelectItem value="小班 Ivy K1">小班 Ivy K1</SelectItem>
              <SelectItem value="中班 Ivy K2">中班 Ivy K2</SelectItem>
              <SelectItem value="大班 Ivy K3">大班 Ivy K3</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary">{pagination.total} 个课程</Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">单元/课</th>
                <th className="px-4 py-3 text-left text-sm font-medium">课程名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium">等级</th>
                <th className="px-4 py-3 text-left text-sm font-medium">适合年级</th>
                <th className="px-4 py-3 text-left text-sm font-medium">难度</th>
                <th className="px-4 py-3 text-left text-sm font-medium">时长</th>
                <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {courses.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    暂无课程数据
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course._id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">
                      Unit {course.sequence.unit} / Lesson {course.sequence.lesson}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <BookOpen className="mt-1 h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{course.title}</div>
                          {course.metadata.theme && (
                            <div className="text-xs text-muted-foreground">
                              {course.metadata.theme}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getLevelBadgeVariant(course.level)}>
                        {course.level}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {course.targetGrades.join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < course.difficulty
                                ? "text-yellow-500"
                                : "text-gray-300"
                            }
                          >
                            {i < course.difficulty ? "★" : "☆"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {course.estimatedDuration} 分钟
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={course.isActive ? "default" : "secondary"}>
                        {course.isActive ? "启用" : "禁用"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCourse(course)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingCourse(course)}
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
              onClick={() => fetchCourses(pagination.page - 1, pagination.limit)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchCourses(pagination.page + 1, pagination.limit)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 课程表单对话框 */}
      <CourseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        course={editingCourse}
      />

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deletingCourse}
        onOpenChange={() => setDeletingCourse(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除课程 "{deletingCourse?.title}" 吗？此操作无法撤销。
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
  );
}
