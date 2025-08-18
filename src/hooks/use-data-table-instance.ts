import * as React from "react";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

// 定义分页信息接口
interface PaginationMeta {
  pageIndex: number;
  pageSize: number;
  totalRows: number;
}

// 定义元数据接口
interface TableMeta {
  pagination?: PaginationMeta;
}

type UseDataTableInstanceProps<TData, TValue> = {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  enableRowSelection?: boolean;
  defaultPageIndex?: number;
  defaultPageSize?: number;
  getRowId?: (row: TData, index: number) => string;
  meta?: TableMeta;
};

// 初始化分页状态
const initializePagination = (meta?: TableMeta, defaultPageIndex?: number, defaultPageSize?: number) => ({
  pageIndex: meta?.pagination?.pageIndex ?? defaultPageIndex ?? 0,
  pageSize: meta?.pagination?.pageSize ?? defaultPageSize ?? 10,
});

// 计算总页数
const calculatePageCount = (pageSize: number, meta?: TableMeta) =>
  meta?.pagination?.totalRows ? Math.ceil(meta.pagination.totalRows / pageSize) : 1;

// 获取行ID
const getRowIdentifier =
  <TData>(getRowId?: (row: TData, index: number) => string) =>
  (row: TData, index: number) =>
    getRowId ? getRowId(row, index) : ((row as any).id?.toString() ?? (row as any)._id?.toString() ?? index.toString());

export function useDataTableInstance<TData, TValue>({
  data,
  columns,
  enableRowSelection = true,
  defaultPageIndex,
  defaultPageSize,
  getRowId,
  meta,
}: UseDataTableInstanceProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState(initializePagination(meta, defaultPageIndex, defaultPageSize));

  // 计算总页数
  const pageCount = calculatePageCount(pagination.pageSize, meta);

  // 获取行ID函数
  const rowIdentifier = getRowIdentifier(getRowId);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    enableRowSelection,
    getRowId: rowIdentifier,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    // 覆盖计算页面数量的方法，使用后端提供的总记录数
    pageCount,
  });

  return table;
}
