"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, Layers, GitBranch, Zap, MousePointer, AlertTriangle, CircleDot } from "lucide-react";

const demos = [
  {
    id: 1,
    title: "基础 IC 载板渲染",
    description: "学习 Three.js 的核心概念：场景、相机、渲染器，创建一个简单的 IC 载板基板",
    icon: Cpu,
    href: "/demo/threejs/01-basic-ic",
    level: "入门",
    topics: ["Scene 场景", "Camera 相机", "Renderer 渲染器", "Mesh 网格", "Material 材质"],
  },
  {
    id: 2,
    title: "载板走线渲染",
    description: "在 IC 载板上绘制互连走线，学习使用 Line 和 TubeGeometry 创建导线路径",
    icon: GitBranch,
    href: "/demo/threejs/02-circuit-traces",
    level: "基础",
    topics: ["Line 线条", "BufferGeometry", "TubeGeometry", "Path 路径", "颜色管理"],
  },
  {
    id: 3,
    title: "BGA 焊球阵列渲染",
    description: "渲染 BGA 封装底部的焊球阵列，用 InstancedMesh 高效渲染大量球体，并按缺陷类型（桥连、虚焊、缺失）进行状态着色",
    icon: CircleDot,
    href: "/demo/threejs/03-bga-balls",
    level: "进阶",
    topics: ["InstancedMesh 实例化", "vertexColors 顶点颜色", "Matrix4 矩阵变换", "instanceId 交互", "BGA 封装结构"],
  },
  {
    id: 4,
    title: "IC 载板 pcs 网格渲染",
    description: "渲染 Strip 大板上的 pcs（Unit）网格阵列，为每个 pcs 标注序号，学习批量实例化渲染",
    icon: Zap,
    href: "/demo/threejs/04-components",
    level: "进阶",
    topics: ["InstancedMesh 实例化", "网格布局计算", "Text 序号标注", "Group 分组", "坐标映射"],
  },
  {
    id: 5,
    title: "缺陷数据绑定与颜色映射",
    description: "将真实缺陷类型（金面划伤、开路、短路、阻焊偏移等）绑定到 pcs，不同缺陷类别用不同颜色区分",
    icon: Layers,
    href: "/demo/threejs/05-defect-mapping",
    level: "进阶",
    topics: ["数据驱动渲染", "颜色映射策略", "缺陷分类着色", "Raycaster 点击", "Tooltip 信息面板"],
  },
  {
    id: 6,
    title: "缺陷交互与详情展示",
    description: "基于 Demo 5 实现人工复判流程，支持键盘导航选择 PCS，查看缺陷图片，快捷键标记 OK/NG，自动跳过 ET 缺陷",
    icon: MousePointer,
    href: "/demo/threejs/06-defect-interaction",
    level: "高级",
    topics: ["键盘导航", "快捷键复判", "状态管理", "高亮选中", "图片展示", "进度追踪"],
  },
  {
    id: 7,
    title: "检测报告可视化",
    description: "实战案例：统计各类缺陷数量、良品率，相机动画聚焦到缺陷区域，生成可交互的检测报告视图",
    icon: AlertTriangle,
    href: "/demo/threejs/07-inspection-report",
    level: "高级",
    topics: ["useFrame 动画", "相机 lerp 聚焦", "数据聚合统计", "良品率计算", "缺陷热力图"],
  },
];

export default function ThreeJsDemosPage() {
  return (
    <div className="@container/main flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Three.js IC 载板渲染学习 Demo</h1>
        <p className="text-muted-foreground">
          专为 IC 载板工业故障检测软件设计的 Three.js 学习路径，从零基础到实战应用
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
