"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, Layers, GitBranch, Zap, MousePointer, AlertTriangle } from "lucide-react";

const demos = [
  {
    id: 1,
    title: "基础 PCB 板渲染",
    description: "学习 Three.js 的核心概念：场景、相机、渲染器，创建一个简单的绿色 PCB 板",
    icon: Cpu,
    href: "/demo/threejs/01-basic-pcb",
    level: "入门",
    topics: ["Scene 场景", "Camera 相机", "Renderer 渲染器", "Mesh 网格", "Material 材质"],
  },
  {
    id: 2,
    title: "电路走线渲染",
    description: "在 PCB 板上绘制电路走线，学习使用 Line 和 TubeGeometry 创建导线路径",
    icon: GitBranch,
    href: "/demo/threejs/02-circuit-traces",
    level: "基础",
    topics: ["Line 线条", "BufferGeometry", "TubeGeometry", "Path 路径", "颜色管理"],
  },
  {
    id: 3,
    title: "PCB 元器件",
    description: "添加电阻、电容、芯片等元器件，学习几何体组合和复杂模型构建",
    icon: Zap,
    href: "/demo/threejs/03-components",
    level: "进阶",
    topics: ["Group 分组", "几何体组合", "Transform 变换", "InstancedMesh", "模型复用"],
  },
  {
    id: 4,
    title: "多层 PCB 结构",
    description: "展示多层电路板结构，学习透明材质和层叠渲染技术",
    icon: Layers,
    href: "/demo/threejs/04-multilayer",
    level: "进阶",
    topics: ["透明材质", "Layer 图层", "Clipping 裁剪", "Section 切面", "结构可视化"],
  },
  {
    id: 5,
    title: "交互控制",
    description: "实现鼠标交互、元器件选择、高亮显示、标注等交互功能",
    icon: MousePointer,
    href: "/demo/threejs/05-interaction",
    level: "高级",
    topics: ["OrbitControls", "Raycaster 射线", "事件处理", "高亮效果", "标注系统"],
  },
  {
    id: 6,
    title: "故障检测可视化",
    description: "实战案例：在 PCB 上高亮显示故障区域，添加动态效果和诊断信息",
    icon: AlertTriangle,
    href: "/demo/threejs/06-fault-detection",
    level: "高级",
    topics: ["动画系统", "粒子效果", "Shader 着色器", "数据可视化", "实时更新"],
  },
];

export default function ThreeJsDemosPage() {
  return (
    <div className="@container/main flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Three.js PCB 渲染学习 Demo</h1>
        <p className="text-muted-foreground">
          专为 PCB 工业故障检测软件设计的 Three.js 学习路径，从零基础到实战应用
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {demos.map((demo) => {
          const Icon = demo.icon;
          return (
            <Link key={demo.id} href={demo.href}>
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        demo.level === "入门"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : demo.level === "基础"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : demo.level === "进阶"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      }`}
                    >
                      {demo.level}
                    </span>
                  </div>
                  <CardTitle className="mt-4">
                    Demo {demo.id}: {demo.title}
                  </CardTitle>
                  <CardDescription>{demo.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">学习要点：</p>
                    <div className="flex flex-wrap gap-2">
                      {demo.topics.map((topic, index) => (
                        <span
                          key={index}
                          className="rounded-md bg-secondary px-2 py-1 text-xs"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border bg-muted/50 p-6">
        <h2 className="mb-2 text-lg font-semibold">学习建议</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• <strong>循序渐进</strong>：按照 Demo 1 → 6 的顺序学习，每个 demo 都建立在前一个的基础上</li>
          <li>• <strong>动手实践</strong>：每个 demo 页面都包含详细注释，建议自己修改参数观察变化</li>
          <li>• <strong>查看源码</strong>：所有 demo 代码都在 <code className="bg-secondary px-1 rounded">src/components/demos/threejs/</code> 目录下</li>
          <li>• <strong>参考文档</strong>：遇到不懂的概念，查阅 <a href="https://threejs.org/docs/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Three.js 官方文档</a></li>
        </ul>
      </div>
    </div>
  );
}
