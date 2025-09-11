"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { MovieResponse } from "@/types/movie";

import { AddMovieDialog } from "./_components/add-movie-dialog";
import { movieColumns } from "./_components/movie-columns";
import { MovieWithCallback } from "./_components/types";

// 定义分页信息接口
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Filters {
  search?: string;
}
export default function MoviesPage() {
  const [movies, setMovies] = useState<MovieWithCallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // 获取电影数据（支持分页）
  const fetchMovies = useCallback(
    async (page = 1, pageSize: number) => {
      try {
        setLoading(true);

        // 构建查询参数
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("limit", pageSize.toString());

        // 添加筛选条件
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value.toString());
        });

        const response = await fetch(`/api/movies?${queryParams.toString()}`);
        if (response.ok) {
          const { data, pagination: newPagination } = await response.json();

          // 为每个电影添加更新回调
          const moviesWithCallbacks = data.map((movie: MovieResponse) => ({
            ...movie,
            onMovieUpdated: fetchMovies,
          }));

          setMovies(moviesWithCallbacks);
          setPagination(newPagination);
        }
      } catch (error) {
        console.error("Error fetching movies:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    // 初始化时获取第一页数据
    fetchMovies(1, pagination.limit);
  }, [fetchMovies, pagination.limit]);

  // 创建表格实例
  const table = useDataTableInstance({
    data: movies,
    columns: movieColumns,
    getRowId: (row) => row._id,
    // 配置分页
    meta: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.limit,
        totalRows: pagination.total,
      },
    },
  });

  if (loading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">电影</h1>
        </div>
        <div className="flex h-64 items-center justify-center">
          <span className="text-muted-foreground">正在加载电影...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">电影</h1>
          <p className="text-muted-foreground">管理电影数据</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增电影
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{pagination.total} 部电影</Badge>
        </div>
        <DataTableViewOptions table={table} />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table} columns={movieColumns} />
      </div>

      <DataTablePagination
        table={table}
        currentPage={pagination.page}
        pageSize={pagination.limit}
        totalCount={pagination.total}
        totalPages={pagination.totalPages}
        isLoading={loading}
        onPageChange={async (page) => {
          await fetchMovies(page, pagination.limit);
        }}
        onPageSizeChange={async (newPageSize) => {
          await fetchMovies(1, newPageSize);
        }}
        pageSizeOptions={[10, 20, 30, 50]}
      />

      {/* 添加电影对话框 */}
      <AddMovieDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onMovieAdded={() => fetchMovies(1, pagination.limit)}
      />
    </div>
  );
}
