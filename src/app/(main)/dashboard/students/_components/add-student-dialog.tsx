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
import { IChild } from "@/models/child";

// 表单验证模式
const studentFormSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  gender: z.enum(["男", "女"], {
    required_error: "请选择性别",
  }),
  birthDate: z.string().min(1, "出生日期不能为空"),
  studentId: z.string().min(1, "学号不能为空"),
  classId: z.string().min(1, "请选择班级"),
  enrollmentDate: z.string().min(1, "入学日期不能为空"),
  avatar: z.string().optional(),
  notes: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded: () => void;
  student?: IChild | null;
}

interface ClassOption {
  _id: string;
  name: string;
  grade: string;
}

export function AddStudentDialog({ open, onOpenChange, onStudentAdded, student }: AddStudentDialogProps) {
  const [gender, setGender] = React.useState<string>("");
  const [classId, setClassId] = React.useState<string>("");
  const [classes, setClasses] = React.useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = React.useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      gender: "男",
      birthDate: "",
      studentId: "",
      classId: "",
      enrollmentDate: new Date().toISOString().split("T")[0],
      avatar: "",
      notes: "",
    },
  });

  const isEditing = Boolean(student);

  // 获取班级列表
  React.useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const response = await fetch("/api/classes?limit=100");
        if (response.ok) {
          const { data } = await response.json();
          setClasses(data);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setLoadingClasses(false);
      }
    };

    if (open) {
      fetchClasses();
    }
  }, [open]);

  React.useEffect(() => {
    if (open && student) {
      const classIdValue = typeof student.class === 'object' && student.class !== null
        ? (student.class as any)._id?.toString()
        : String(student.class || "");

      form.reset({
        name: student.name,
        gender: student.gender,
        birthDate: new Date(student.birthDate).toISOString().split("T")[0],
        studentId: student.studentId,
        classId: classIdValue,
        enrollmentDate: new Date(student.enrollment.startDate).toISOString().split("T")[0],
        avatar: student.avatar || "",
        notes: student.notes || "",
      });
      setGender(student.gender);
      setClassId(classIdValue);
    }

    if (!open && !student) {
      form.reset({
        name: "",
        gender: "男",
        birthDate: "",
        studentId: "",
        classId: "",
        enrollmentDate: new Date().toISOString().split("T")[0],
        avatar: "",
        notes: "",
      });
      setGender("");
      setClassId("");
    }
  }, [open, student, form]);

  const handleSubmit = async (data: StudentFormValues) => {
    try {
      const studentData = {
        name: data.name,
        gender: data.gender,
        birthDate: new Date(data.birthDate),
        studentId: data.studentId,
        classId: data.classId,
        enrollment: {
          startDate: new Date(data.enrollmentDate),
          status: "在读",
        },
        avatar: data.avatar,
        notes: data.notes,
      };

      const url = student && student._id ? `/api/students/${student._id}` : "/api/students";
      const method = student && student._id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studentData),
      });

      if (response.ok) {
        toast.success(method === "PATCH" ? "更新学生成功" : "添加学生成功");
        onOpenChange(false);
        form.reset();
        onStudentAdded();
      } else {
        const error = await response.json();
        toast.error(error.error || "操作失败");
      }
    } catch (error) {
      console.error("Error saving student:", error);
      toast.error("操作失败，请重试");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑学生" : "添加新学生"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "修改学生信息" : "填写以下信息添加一个新学生"}
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
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="输入学生姓名"
                aria-invalid={!!form.formState.errors.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">性别 *</Label>
              <Select
                value={gender}
                onValueChange={(value) => {
                  setGender(value);
                  form.setValue("gender", value as any);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="男">男</SelectItem>
                  <SelectItem value="女">女</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="birthDate">出生日期 *</Label>
              <Input
                id="birthDate"
                type="date"
                {...form.register("birthDate")}
                aria-invalid={!!form.formState.errors.birthDate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentId">学号 *</Label>
              <Input
                id="studentId"
                {...form.register("studentId")}
                placeholder="例如：S2024001"
                aria-invalid={!!form.formState.errors.studentId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="classId">所属班级 *</Label>
              <Select
                value={classId}
                onValueChange={(value) => {
                  setClassId(value);
                  form.setValue("classId", value);
                }}
                disabled={loadingClasses}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingClasses ? "加载中..." : "选择班级"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.name} ({cls.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="enrollmentDate">入学日期 *</Label>
              <Input
                id="enrollmentDate"
                type="date"
                {...form.register("enrollmentDate")}
                aria-invalid={!!form.formState.errors.enrollmentDate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">头像URL</Label>
            <Input
              id="avatar"
              {...form.register("avatar")}
              placeholder="输入头像URL（可选）"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="输入备注信息（可选）"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">{isEditing ? "保存更改" : "添加学生"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
