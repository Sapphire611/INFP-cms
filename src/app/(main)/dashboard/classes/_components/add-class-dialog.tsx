import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IClass } from "@/models/class";

// 表单验证模式
const classFormSchema = z.object({
  name: z.string().min(1, "班级名称不能为空"),
  grade: z.enum(["小班", "中班", "大班", "学前班"], {
    required_error: "请选择年级",
  }),
  classCode: z.string().min(1, "班级代码不能为空"),
  year: z.string().min(1, "学年不能为空"),
  semester: z.enum(["春季", "秋季"], {
    required_error: "请选择学期",
  }),
  capacity: z.number().min(1, "容量至少为1").max(50, "容量不能超过50"),
  description: z.string().optional(),
  primaryTeacherId: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classFormSchema>;

interface AddClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassAdded: () => void;
  classItem?: IClass | null;
}

interface Teacher {
  _id: string;
  profile: {
    name: string;
  };
}

export function AddClassDialog({ open, onOpenChange, onClassAdded, classItem }: AddClassDialogProps) {
  const [grade, setGrade] = React.useState<string>("");
  const [semester, setSemester] = React.useState<string>("");
  const [primaryTeacher, setPrimaryTeacher] = React.useState<string>("");
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      grade: "小班",
      classCode: "",
      year: new Date().getFullYear().toString(),
      semester: "春季",
      capacity: 30,
      description: "",
      primaryTeacherId: "",
    },
  });

  const isEditing = Boolean(classItem);

  // 获取教师列表
  React.useEffect(() => {
    if (open) {
      fetch("/api/users?userType=teacher&limit=1000")
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setTeachers(data.data);
          }
        })
        .catch((err) => console.error("Error fetching teachers:", err));
    }
  }, [open]);

  React.useEffect(() => {
    if (open && classItem) {
      // 查找班主任
      const primaryTeacher = classItem.teachers?.find((t: any) => t.isPrimary && t.role === "班主任");
      const primaryTeacherId = primaryTeacher?.teacher?._id || primaryTeacher?.teacher || "";

      form.reset({
        name: classItem.name,
        grade: classItem.grade,
        classCode: classItem.classCode,
        year: classItem.academic.year,
        semester: classItem.academic.semester,
        capacity: classItem.capacity,
        description: classItem.description || "",
        primaryTeacherId: primaryTeacherId,
      });
      setGrade(classItem.grade);
      setSemester(classItem.academic.semester);
      setPrimaryTeacher(primaryTeacherId);
    }

    if (!open && !classItem) {
      form.reset({
        name: "",
        grade: "小班",
        classCode: "",
        year: new Date().getFullYear().toString(),
        semester: "春季",
        capacity: 30,
        description: "",
        primaryTeacherId: "",
      });
      setGrade("");
      setSemester("");
      setPrimaryTeacher("");
    }
  }, [open, classItem, form]);

  const handleSubmit = async (data: ClassFormValues) => {
    try {
      // 构建教师数组
      const teachers = [];
      if (data.primaryTeacherId) {
        teachers.push({
          teacher: data.primaryTeacherId,
          role: "班主任",
          isPrimary: true,
          assignedAt: new Date(),
        });
      }

      const classData = {
        name: data.name,
        grade: data.grade,
        classCode: data.classCode,
        academic: {
          year: data.year,
          semester: data.semester,
        },
        capacity: data.capacity,
        description: data.description,
        isActive: true,
        teachers: teachers,
      };

      const url = classItem && classItem._id ? `/api/classes/${classItem._id}` : "/api/classes";
      const method = classItem && classItem._id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(classData),
      });

      if (response.ok) {
        toast.success(method === "PATCH" ? "更新班级成功" : "添加班级成功");
        onOpenChange(false);
        form.reset();
        onClassAdded();
      } else {
        const error = await response.json();
        toast.error(error.error || "操作失败");
      }
    } catch (error) {
      console.error("Error saving class:", error);
      toast.error("操作失败，请重试");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑班级" : "添加新班级"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "修改班级信息" : "填写以下信息添加一个新班级"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {Object.keys(form.formState.errors).length > 0 && (
            <div className="destructive mt-1 text-sm">
              {Object.values(form.formState.errors)
                .map((e) => String(e?.message))
                .filter(Boolean)
                .join("，")}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">班级名称 *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="例如：幼儿一班"
                aria-invalid={!!form.formState.errors.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="classCode">班级代码 *</Label>
              <Input
                id="classCode"
                {...form.register("classCode")}
                placeholder="例如：K1-A"
                aria-invalid={!!form.formState.errors.classCode}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="grade">年级 *</Label>
              <Select
                value={grade}
                onValueChange={(value) => {
                  setGrade(value);
                  form.setValue("grade", value as any);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择年级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="小班">小班</SelectItem>
                  <SelectItem value="中班">中班</SelectItem>
                  <SelectItem value="大班">大班</SelectItem>
                  <SelectItem value="学前班">学前班</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">班级容量 *</Label>
              <Input
                id="capacity"
                type="number"
                {...form.register("capacity", { valueAsNumber: true })}
                aria-invalid={!!form.formState.errors.capacity}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="year">学年 *</Label>
              <Input
                id="year"
                {...form.register("year")}
                placeholder="例如：2024"
                aria-invalid={!!form.formState.errors.year}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">学期 *</Label>
              <Select
                value={semester}
                onValueChange={(value) => {
                  setSemester(value);
                  form.setValue("semester", value as any);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择学期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="春季">春季</SelectItem>
                  <SelectItem value="秋季">秋季</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryTeacher">班主任（可选）</Label>
            <div className="flex gap-2">
              <Select
                value={primaryTeacher || undefined}
                onValueChange={(value) => {
                  setPrimaryTeacher(value);
                  form.setValue("primaryTeacherId", value);
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="选择班主任" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher._id} value={teacher._id}>
                      {teacher.profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {primaryTeacher && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPrimaryTeacher("");
                    form.setValue("primaryTeacherId", "");
                  }}
                >
                  清除
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">班级描述</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="输入班级描述（可选）"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">{isEditing ? "保存更改" : "添加班级"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
