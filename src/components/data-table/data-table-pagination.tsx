import * as React from "react";
import { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  currentPage: number; // 当前页码（从1开始）
  pageSize: number; // 每页条数
  totalCount: number; // 总记录数
  totalPages: number; // 总页数
  isLoading?: boolean; // 加载状态
  onPageChange?: (page: number) => void; // 页码变化回调
  onPageSizeChange?: (pageSize: number) => void; // 每页条数变化回调
  pageSizeOptions?: number[]; // 可选的每页条数选项
}

export function DataTablePagination<TData>({
  table,
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 40, 50],
}: DataTablePaginationProps<TData>): JSX.Element {
  const handlePageChange = React.useCallback(
    (newPage: number) => {
      if (onPageChange) {
        onPageChange(newPage);
      }
    },
    [onPageChange],
  );

  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      if (onPageSizeChange) {
        onPageSizeChange(newPageSize);
      }
    },
    [onPageSizeChange],
  );

  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">总共 {totalCount} 条数据</div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            每页行数
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={async (value) => {
              const newPageSize = Number(value);
              handlePageSizeChange(newPageSize);
            }}
            disabled={isLoading}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          第 {currentPage} 页，共 {totalPages} 页
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1 || isLoading}
          >
            <span className="sr-only">跳到第一页</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            <span className="sr-only">上一页</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
          >
            <span className="sr-only">下一页</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || isLoading}
          >
            <span className="sr-only">跳到最后一页</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
