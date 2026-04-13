# Data Table Components

可复用的数据表格组件库，基于 TanStack Table 和 dnd-kit 构建。

## 文件说明

### `data-table.tsx`
核心表格组件，支持拖拽排序功能。
- 接收 TanStack Table 实例和列定义
- 可选启用拖拽排序（`dndEnabled` prop）
- 提供 `onReorder` 回调处理排序后的数据
- 使用 DndContext 和 SortableContext 实现拖拽

### `data-table-column-header.tsx`
表头单元格组件，支持排序功能。
- 显示列标题
- 点击切换升序/降序/无排序
- 显示排序图标指示当前状态

### `data-table-pagination.tsx`
分页控制组件。
- 显示当前页码和总页数
- 上一页/下一页按钮
- 每页显示数量选择器
- 显示已选中行数统计

### `data-table-view-options.tsx`
列可见性控制组件。
- 下拉菜单显示所有可切换列
- 勾选框控制列的显示/隐藏
- 自动过滤不可隐藏的列（如操作列）

### `drag-column.tsx`
拖拽手柄列定义。
- 导出 `dragColumn` 列配置
- 渲染拖拽图标（GripVertical）
- 禁用排序和隐藏功能

### `draggable-row.tsx`
可拖拽的表格行组件。
- 使用 `useSortable` hook 实现拖拽
- 拖拽时显示半透明效果
- 自动处理拖拽动画和过渡

### `table-utils.ts`
工具函数集合。
- `withDndColumn()` - 在列定义数组前插入拖拽列
- 简化启用拖拽功能的配置

## 使用示例

```tsx
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { withDndColumn } from "@/components/data-table/table-utils";

// 启用拖拽排序
const columnsWithDrag = withDndColumn(columns);

<DataTable 
  table={table} 
  columns={columnsWithDrag}
  dndEnabled={true}
  onReorder={(newData) => setData(newData)}
/>
<DataTablePagination table={table} />
<DataTableViewOptions table={table} />
```

## 当前使用位置

- `src/app/(main)/cms/users/page.tsx` - 用户管理表格
- `src/app/(main)/demo/threejs/_components/data-table.tsx` - Three.js 演示表格
