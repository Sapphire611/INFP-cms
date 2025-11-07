"use client";

import { useCallback, useEffect, useState } from "react";

import { Download } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { performanceColumns, PerformanceData } from "./_components/performance-columns";

// 定义分页信息接口
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Filters {
  classId?: string;
  startDate?: string;
  endDate?: string;
}

interface ClassOption {
  _id: string;
  name: string;
  grade: string;
}

export default function PerformancePage() {
  const [performances, setPerformances] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({});
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // 获取班级列表
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch("/api/classes?limit=100");
        if (response.ok) {
          const { data } = await response.json();
          setClasses(data);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };

    fetchClasses();
  }, []);

  // 获取学习表现数据（支持分页）
  const fetchPerformances = useCallback(
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

        const response = await fetch(`/api/performance?${queryParams.toString()}`);
        if (response.ok) {
          const { data, pagination: newPagination } = await response.json();
          setPerformances(data);
          setPagination(newPagination);
        }
      } catch (error) {
        console.error("Error fetching performances:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    // 初始化时获取第一页数据（使用固定的初始页面大小）
    fetchPerformances(1, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当筛选条件改变时，重新获取数据
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      fetchPerformances(1, 20);
    }
  }, [filters, fetchPerformances]);

  // 创建表格实例
  const table = useDataTableInstance({
    data: performances,
    columns: performanceColumns,
    getRowId: (row) => row._id?.toString() || String(Math.random()),
    // 配置分页
    meta: {
      pagination: {
        pageIndex: (pagination?.page || 1) - 1,
        pageSize: pagination?.limit || 20,
        totalRows: pagination?.total || 0,
      },
    },
  });

  const handleClassFilterChange = (value: string) => {
    setSelectedClass(value);
    if (value === "all") {
      setFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters.classId;
        return newFilters;
      });
    } else {
      setFilters((prev) => ({ ...prev, classId: value }));
    }
  };

  if (loading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">学习表现</h1>
        </div>
        <div className="flex h-64 items-center justify-center">
          <span className="text-muted-foreground">正在加载数据...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">学习表现</h1>
          <p className="text-muted-foreground">查看学生的学习表现和进度</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          导出数据
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-[200px]">
            <Select value={selectedClass} onValueChange={handleClassFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="选择班级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有班级</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.name} ({cls.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary">{pagination?.total || 0} 条记录</Badge>
        </div>
        <DataTableViewOptions table={table} />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table} columns={performanceColumns} />
      </div>

      <DataTablePagination
        table={table}
        currentPage={pagination?.page || 1}
        pageSize={pagination?.limit || 20}
        totalCount={pagination?.total || 0}
        totalPages={pagination?.totalPages || 1}
        isLoading={loading}
        onPageChange={async (page) => {
          await fetchPerformances(page, pagination?.limit || 20);
        }}
        onPageSizeChange={async (newPageSize) => {
          await fetchPerformances(1, newPageSize);
        }}
        pageSizeOptions={[10, 20, 30, 50]}
      />
    </div>
  );
}
