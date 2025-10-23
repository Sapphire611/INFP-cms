import { ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { MovieWithCallback } from "./types";

export const movieColumns: ColumnDef<MovieWithCallback>[] = [
  {
    accessorKey: "title",
    header: "电影标题",
    cell: ({ row }) => {
      const movie = row.original;
      return (
        <div className="w-[300px] truncate overflow-hidden font-medium whitespace-nowrap" title={movie.title}>
          {movie.title}
        </div>
      );
    },
  },
  {
    accessorKey: "year",
    header: "年份",
    cell: ({ row }) => {
      const movie = row.original;
      return <span>{movie.year}</span>;
    },
  },
  {
    accessorKey: "genres",
    header: "类型",
    cell: ({ row }) => {
      const movie = row.original;
      return (
        <div className="flex flex-wrap gap-1">
          {movie.genres.map((genre) => (
            <Badge key={genre} variant="secondary">
              {genre}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "runtime",
    header: "时长(分钟)",
    cell: ({ row }) => {
      const movie = row.original;
      return <span>{movie.runtime}</span>;
    },
  },
  {
    accessorKey: "imdb.rating",
    header: "IMDB评分",
    cell: ({ row }) => {
      const movie = row.original;
      return <span>{movie.imdb?.rating || "N/A"}</span>;
    },
  },
  {
    accessorKey: "rated",
    header: "分级",
    cell: ({ row }) => {
      const movie = row.original;
      return movie.rated ? <Badge variant="outline">{movie.rated}</Badge> : <Badge variant="outline">N/A</Badge>;
    },
  },
  {
    id: "actions",
    header: "操作",
    cell: ({ row }) => {
      const movie = row.original;
      return (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // 编辑电影逻辑
              console.log("Edit movie:", movie);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // 删除电影逻辑
              if (confirm("确定要删除这部电影吗?")) {
                fetch(`/api/movies/${movie._id}`, {
                  method: "DELETE",
                }).then(() => {
                  movie.onMovieUpdated();
                });
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
