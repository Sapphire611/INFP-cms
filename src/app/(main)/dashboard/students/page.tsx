"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { IChild } from "@/models/child";

import { AddStudentDialog } from "./_components/add-student-dialog";
import { studentColumns } from "./_components/student-columns";
import { StudentWithCallback } from "./_components/types";

// 定义分页信息接口
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Filters {
  search?: string;
  classId?: string;
  status?: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithCallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<IChild | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // 获取学生数据（支持分页）
  const fetchStudents = useCallback(
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

        const response = await fetch(`/api/students?${queryParams.toString()}`);
        if (response.ok) {
          const { data, pagination: newPagination } = await response.json();

          // 为每个学生添加更新回调和编辑回调
          const studentsWithCallbacks = data.map((student: IChild) => ({
            ...student,
            onStudentUpdated: () => fetchStudents(1, pagination.limit),
            onEdit: async () => {
              try {
                const res = await fetch(`/api/students/${student._id}`);
                if (res.ok) {
                  const full = await res.json();
                  setSelectedStudent(full as IChild);
                  setIsEditOpen(true);
                } else {
                  console.error("Failed to fetch student details for edit");
                }
              } catch (err) {
                console.error("Error fetching student for edit:", err);
              }
            },
          }));

          setStudents(studentsWithCallbacks);
          setPagination(newPagination);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    // 初始化时获取第一页数据
    fetchStudents(1, pagination.limit);
  }, [fetchStudents, pagination.limit]);

  // 创建表格实例
  const table = useDataTableInstance({
    data: students,
    columns: studentColumns,
    getRowId: (row) => row._id?.toString() || String(Math.random()),
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
          <h1 className="text-2xl font-bold">学生管理</h1>
        </div>
        <div className="flex h-64 items-center justify-center">
          <span className="text-muted-foreground">正在加载学生...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">学生管理</h1>
          <p className="text-muted-foreground">管理幼儿园学生信息</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          添加学生
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{pagination.total} 名学生</Badge>
        </div>
        <DataTableViewOptions table={table} />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table} columns={studentColumns} />
      </div>

      <DataTablePagination
        table={table}
        currentPage={pagination.page}
        pageSize={pagination.limit}
        totalCount={pagination.total}
        totalPages={pagination.totalPages}
        isLoading={loading}
        onPageChange={async (page) => {
          await fetchStudents(page, pagination.limit);
        }}
        onPageSizeChange={async (newPageSize) => {
          await fetchStudents(1, newPageSize);
        }}
        pageSizeOptions={[10, 20, 30, 50]}
      />

      {/* 添加学生对话框 */}
      <AddStudentDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onStudentAdded={() => fetchStudents(1, pagination.limit)}
      />

      {/* 编辑学生对话框（复用同一个组件） */}
      <AddStudentDialog
        open={isEditOpen}
        onOpenChange={(v) => {
          setIsEditOpen(v);
          if (!v) setSelectedStudent(null);
        }}
        student={selectedStudent}
        onStudentAdded={() => {
          fetchStudents(1, pagination.limit);
          setIsEditOpen(false);
          setSelectedStudent(null);
        }}
      />
    </div>
  );
}
