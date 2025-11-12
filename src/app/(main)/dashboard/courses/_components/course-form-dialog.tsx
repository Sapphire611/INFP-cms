"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

// 表单验证模式
const courseFormSchema = z.object({
  title: z.string().min(1, "课程标题不能为空"),
  description: z.string().min(1, "课程描述不能为空"),
  level: z.enum(["Beginner", "Elementary", "Intermediate"], {
    required_error: "请选择课程等级",
  }),
  targetGrades: z.array(z.string()).min(1, "请至少选择一个适合年级"),
  unit: z.number().min(1, "单元号必须大于0"),
  lesson: z.number().min(1, "课时号必须大于0"),
  order: z.number().min(1, "顺序必须大于0"),
  theme: z.string().optional(),
  difficulty: z.number().min(1).max(5),
  estimatedDuration: z.number().min(1, "预计时长必须大于0"),
  objectives: z.string().optional(),
  pdfUrl: z.string().optional(),
  isActive: z.boolean(),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

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
    theme?: string;
  };
  difficulty: number;
  estimatedDuration: number;
  content: {
    objectives: string[];
  };
  isActive: boolean;
}

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  course?: Course | null;
}

const gradeOptions = [
  { value: "小班 Ivy K1", label: "小班 Ivy K1" },
  { value: "中班 Ivy K2", label: "中班 Ivy K2" },
  { value: "大班 Ivy K3", label: "大班 Ivy K3" },
];

export function CourseFormDialog({
  open,
  onOpenChange,
  onSuccess,
  course,
}: CourseFormDialogProps) {
  const [level, setLevel] = React.useState<string>("");
  const [selectedGrades, setSelectedGrades] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditing = Boolean(course);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      level: "Beginner",
      targetGrades: [],
      unit: 1,
      lesson: 1,
      order: 1,
      theme: "",
      difficulty: 1,
      estimatedDuration: 30,
      objectives: "",
      pdfUrl: "",
      isActive: true,
    },
  });

  // 初始化表单数据
  React.useEffect(() => {
    if (open && course) {
      const objectives = course.content?.objectives?.join("\n") || "";
      form.reset({
        title: course.title,
        description: course.description,
        level: course.level as any,
        targetGrades: course.targetGrades || [],
        unit: course.sequence.unit,
        lesson: course.sequence.lesson,
        order: course.sequence.order,
        theme: course.metadata?.theme || "",
        difficulty: course.difficulty,
        estimatedDuration: course.estimatedDuration,
        objectives,
        pdfUrl: "",
        isActive: course.isActive,
      });
      setLevel(course.level);
      setSelectedGrades(course.targetGrades || []);
    }

    if (!open && !course) {
      form.reset();
      setLevel("");
      setSelectedGrades([]);
    }
  }, [open, course, form]);

  const handleGradeToggle = (grade: string) => {
    const newGrades = selectedGrades.includes(grade)
      ? selectedGrades.filter((g) => g !== grade)
      : [...selectedGrades, grade];
    setSelectedGrades(newGrades);
    form.setValue("targetGrades", newGrades);
  };

  const handleSubmit = async (data: CourseFormValues) => {
    try {
      setIsSubmitting(true);

      const objectives = data.objectives
        ? data.objectives.split("\n").filter((obj) => obj.trim())
        : [];

      const courseData = {
        title: data.title,
        description: data.description,
        level: data.level,
        targetGrades: data.targetGrades,
        sequence: {
          unit: data.unit,
          lesson: data.lesson,
          order: data.order,
        },
        metadata: {
          theme: data.theme || "",
          semester: 1,
          week: 1,
          unit: "",
          code: "",
          festival: "",
          difficulty: data.difficulty,
          duration: data.estimatedDuration,
          tags: [],
        },
        content: {
          vocabulary: { words: [], exercises: [] },
          phonics: {
            letters: [],
            sounds: [],
            rules: "",
            audio: "",
            exercises: [],
          },
          sentences: { patterns: [], examples: [], dialogues: [], audio: "" },
          songs: { title: "", lyrics: "", audio: "", video: "", actions: [] },
          videos: [],
          presentations: data.pdfUrl
            ? [
                {
                  title: data.title,
                  url: data.pdfUrl,
                  pageCount: 0,
                  thumbnail: "",
                },
              ]
            : [],
          audios: [],
          objectives,
        },
        difficulty: data.difficulty,
        estimatedDuration: data.estimatedDuration,
        isActive: data.isActive,
      };

      const url = course?._id ? `/api/courses/${course._id}` : "/api/courses";
      const method = course?._id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        toast.success(method === "PATCH" ? "更新课程成功" : "创建课程成功");
        onOpenChange(false);
        form.reset();
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || "操作失败");
      }
    } catch (error) {
      console.error("Error saving course:", error);
      toast.error("操作失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑课程" : "新增课程"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "修改课程信息" : "填写课程基本信息"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {Object.keys(form.formState.errors).length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {Object.values(form.formState.errors)
                .map((e) => String(e?.message))
                .filter(Boolean)
                .join("；")}
            </div>
          )}

          <Accordion type="multiple" defaultValue={["basic", "sequence"]}>
            {/* 基本信息 */}
            <AccordionItem value="basic">
              <AccordionTrigger className="text-base font-semibold">
                基本信息
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">课程标题 *</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="例如：Learning Letters A-Z"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">课程描述 *</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="介绍课程内容和学习要点"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="level">课程等级 *</Label>
                    <Select
                      value={level}
                      onValueChange={(value) => {
                        setLevel(value);
                        form.setValue("level", value as any);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择等级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Elementary">Elementary</SelectItem>
                        <SelectItem value="Intermediate">
                          Intermediate
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">难度 (1-5星) *</Label>
                    <Input
                      id="difficulty"
                      type="number"
                      min={1}
                      max={5}
                      {...form.register("difficulty", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>适合年级 *</Label>
                  <div className="flex gap-4">
                    {gradeOptions.map((grade) => (
                      <div key={grade.value} className="flex items-center gap-2">
                        <Checkbox
                          id={grade.value}
                          checked={selectedGrades.includes(grade.value)}
                          onCheckedChange={() => handleGradeToggle(grade.value)}
                        />
                        <Label htmlFor={grade.value} className="cursor-pointer">
                          {grade.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">课程主题</Label>
                  <Input
                    id="theme"
                    {...form.register("theme")}
                    placeholder="例如：Colors and Shapes"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 课程序号 */}
            <AccordionItem value="sequence">
              <AccordionTrigger className="text-base font-semibold">
                课程序号
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">单元号 *</Label>
                    <Input
                      id="unit"
                      type="number"
                      min={1}
                      {...form.register("unit", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lesson">课时号 *</Label>
                    <Input
                      id="lesson"
                      type="number"
                      min={1}
                      {...form.register("lesson", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="order">顺序 *</Label>
                    <Input
                      id="order"
                      type="number"
                      min={1}
                      {...form.register("order", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedDuration">预计时长（分钟）*</Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    min={1}
                    {...form.register("estimatedDuration", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 学习内容 */}
            <AccordionItem value="content">
              <AccordionTrigger className="text-base font-semibold">
                学习内容
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="objectives">学习目标（每行一个）</Label>
                  <Textarea
                    id="objectives"
                    {...form.register("objectives")}
                    placeholder="例如：&#10;学习字母A的发音&#10;认识常见单词apple、ant等&#10;完成字母书写练习"
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pdfUrl">PDF资料链接</Label>
                  <Input
                    id="pdfUrl"
                    {...form.register("pdfUrl")}
                    placeholder="输入PDF文件的URL"
                  />
                  <p className="text-xs text-muted-foreground">
                    提示：请先上传PDF到文件服务器，然后填入URL
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 课程状态 */}
            <AccordionItem value="status">
              <AccordionTrigger className="text-base font-semibold">
                课程状态
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    checked={form.watch("isActive")}
                    onCheckedChange={(checked) =>
                      form.setValue("isActive", !!checked)
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    启用课程（学生可见）
                  </Label>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : isEditing ? "保存更改" : "创建课程"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
