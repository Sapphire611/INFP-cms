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
import { Textarea } from "@/components/ui/textarea";
import { MovieRequest, MovieResponse } from "@/types/movie";

import { TagInput } from "./tag-input";
// 定义表单验证模式
const movieFormSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  plot: z.string().min(1, "剧情简介不能为空"),
  fullplot: z.string().min(1, "完整剧情不能为空"),
  runtime: z.number().min(1, "时长不能为空"),
  poster: z.string().min(1, "海报URL不能为空").url("请输入有效的URL"),
  rated: z.string().min(1, "分级不能为空"),
  year: z.number().min(1900, "年份必须大于1900"),
});

type MovieFormValues = z.infer<typeof movieFormSchema>;

interface AddMovieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMovieAdded: () => void;
  // optional movie to edit; if provided the dialog will act as an editor
  movie?: MovieResponse | null;
}

// Allow higher complexity for this component since it manages form state and editing flow
/* eslint-disable-next-line complexity */
export function AddMovieDialog({ open, onOpenChange, onMovieAdded, movie }: AddMovieDialogProps) {
  // 初始化日期为当前日期的 ISO 格式字符串 (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [genreInput, setGenreInput] = React.useState("");
  const [castInput, setCastInput] = React.useState("");
  const [languageInput, setLanguageInput] = React.useState("");
  const [directorInput, setDirectorInput] = React.useState("");
  const [countryInput, setCountryInput] = React.useState("");
  const [genres, setGenres] = React.useState<string[]>([]);
  const [cast, setCast] = React.useState<string[]>([]);
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [directors, setDirectors] = React.useState<string[]>([]);
  const [countries, setCountries] = React.useState<string[]>([]);
  const [dateError, setDateError] = React.useState<string | null>(null);

  const form = useForm<MovieFormValues>({
    resolver: zodResolver(movieFormSchema),
    defaultValues: {
      title: "",
      plot: "",
      fullplot: "",
      runtime: 1,
      poster: "",
      rated: "",
      year: new Date().getFullYear(),
    },
  });

  const isEditing = Boolean(movie);
  const populateFromMovie = React.useCallback(
    (m: MovieResponse) => {
      form.reset({
        title: m.title,
        plot: m.plot,
        fullplot: m.fullplot,
        runtime: m.runtime ?? 1,
        poster: m.poster,
        rated: m.rated,
        year: m.year ?? new Date().getFullYear(),
      });

      setGenres(m.genres);
      setCast(m.cast);
      setLanguages(m.languages);
      setDirectors(m.directors);
      setCountries(m.countries);

      // set released date string if valid, otherwise keep the current selectedDate
      if (m.released) {
        const d = new Date(m.released);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d.toISOString().split("T")[0]);
          setDateError(null);
        } else {
          setDateError("电影的发布日期无效，已保留当前日期");
        }
      }
    },
    [form],
  );

  React.useEffect(() => {
    if (open && movie) {
      populateFromMovie(movie);
    }

    if (!open && !movie) {
      form.reset();
      setGenres([]);
      setCast([]);
      setLanguages([]);
      setDirectors([]);
      setCountries([]);
      setGenreInput("");
      setCastInput("");
      setLanguageInput("");
      setDirectorInput("");
      setCountryInput("");
      setSelectedDate(new Date().toISOString().split("T")[0]);
      setDateError(null);
    }
  }, [open, movie, populateFromMovie]);

  /* eslint-disable-next-line complexity */
  const handleSubmit = async (data: MovieFormValues) => {
    try {
      // validate selectedDate before submitting
      if (selectedDate) {
        const d = new Date(selectedDate);
        if (isNaN(d.getTime())) {
          setDateError("请选择有效的发布日期");
          return;
        }
        setDateError(null);
      }
      // 构建电影数据对象
      const movieData: MovieRequest = {
        title: data.title,
        plot: data.plot,
        fullplot: data.fullplot,
        runtime: data.runtime,
        poster: data.poster,
        released: selectedDate ? new Date(selectedDate) : new Date(),
        rated: data.rated,
        year: data.year,
        genres,
        cast,
        languages,
        directors,
        countries,
        awards: {
          wins: 0,
          nominations: 0,
          text: "",
        },
        imdb: {
          rating: 0,
          votes: 0,
          id: 0,
        },
      };

      // Determine whether to create or update
      const url = movie && movie._id ? `/api/movies/${movie._id}` : "/api/movies";
      const method = movie && movie._id ? "PATCH" : "POST";

      // send request to API
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(movieData),
      });

      if (response.ok) {
        const title = data.title || movieData.title || "";
        // success toast
        if (method === "PATCH") {
          toast.success(`更新 ${title} 电影成功`);
        } else {
          toast.success(`添加 ${title} 电影成功`);
        }

        // 关闭对话框
        onOpenChange(false);
        // 重置表单
        form.reset();
        setGenres([]);
        setCast([]);
        setLanguages([]);
        setDirectors([]);
        setCountries([]);
        setGenreInput("");
        setCastInput("");
        setLanguageInput("");
        setDirectorInput("");
        setCountryInput("");
        // 通知父组件更新数据
        onMovieAdded();
      } else {
        try {
          const err = await response.json();
          toast.error(err.error ?? "操作失败");
        } catch (e) {
          toast.error("操作失败");
        }
      }
    } catch (error) {
      console.error("Error adding movie:", error);
      alert("添加电影失败，请重试");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑电影" : "添加新电影"}</DialogTitle>
          <DialogDescription>{isEditing ? "修改电影信息" : "填写以下信息添加一部新电影"}</DialogDescription>
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
              <Label htmlFor="title">电影标题</Label>
              <Input id="title" {...form.register("title")} aria-invalid={!!form.formState.errors.title} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">年份</Label>
              <Input id="year" type="number" {...form.register("year")} aria-invalid={!!form.formState.errors.year} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plot">剧情简介</Label>
            <Textarea id="plot" {...form.register("plot")} rows={3} aria-invalid={!!form.formState.errors.plot} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullplot">完整剧情</Label>
            <Textarea
              id="fullplot"
              {...form.register("fullplot")}
              rows={4}
              aria-invalid={!!form.formState.errors.fullplot}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="runtime">时长(分钟)</Label>
              <Input
                id="runtime"
                type="number"
                {...form.register("runtime")}
                aria-invalid={!!form.formState.errors.runtime}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rated">分级</Label>
              <Input id="rated" {...form.register("rated")} aria-invalid={!!form.formState.errors.rated} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poster">海报URL</Label>
            <Input id="poster" {...form.register("poster")} aria-invalid={!!form.formState.errors.poster} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="released">发布日期</Label>
            <Input id="released" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            {dateError && <p className="destructive mt-1 text-sm">{dateError}</p>}
          </div>

          <TagInput
            label="类型"
            tags={genres}
            setTags={setGenres}
            inputValue={genreInput}
            setInputValue={setGenreInput}
            placeholder="添加类型..."
          />
          <TagInput
            label="演员"
            tags={cast}
            setTags={setCast}
            inputValue={castInput}
            setInputValue={setCastInput}
            placeholder="添加演员..."
          />
          <TagInput
            label="语言"
            tags={languages}
            setTags={setLanguages}
            inputValue={languageInput}
            setInputValue={setLanguageInput}
            placeholder="添加语言..."
          />
          <TagInput
            label="导演"
            tags={directors}
            setTags={setDirectors}
            inputValue={directorInput}
            setInputValue={setDirectorInput}
            placeholder="添加导演..."
          />
          <TagInput
            label="国家"
            tags={countries}
            setTags={setCountries}
            inputValue={countryInput}
            setInputValue={setCountryInput}
            placeholder="添加国家..."
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">{isEditing ? "保存更改" : "添加电影"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
