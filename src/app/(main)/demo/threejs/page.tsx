"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, Layers, GitBranch, Zap, MousePointer, AlertTriangle, CircleDot, Upload } from "lucide-react";
import DefectInteraction from "@/components/demos/threejs/DefectInteraction";

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
    id: 7,
    title: "3D 模型导入与加载",
    description: "学习如何导入和加载 GLTF/GLB 格式的 3D 模型，支持动画播放、模型信息展示和交互控制",
    icon: Upload,
    href: "/demo/threejs/import",
    level: "进阶",
    topics: ["useGLTF 模型加载", "useAnimations 动画", "文件上传", "模型信息", "Environment 环境"],
  },
  // {
  //   id: 6,
  //   title: "缺陷交互与详情展示",
  //   description: "基于 Demo 5 实现人工复判流程，支持键盘导航选择 PCS，查看缺陷图片，快捷键标记 OK/NG，自动跳过 ET 缺陷",
  //   icon: MousePointer,
  //   href: "/demo/threejs/06-defect-interaction",
  //   level: "高级",
  //   topics: ["键盘导航", "快捷键复判", "状态管理", "高亮选中", "图片展示", "进度追踪"],
  // },
  // {
  //   id: 7,
  //   title: "检测报告可视化",
  //   description: "实战案例：统计各类缺陷数量、良品率，相机动画聚焦到缺陷区域，生成可交互的检测报告视图",
  //   icon: AlertTriangle,
  //   href: "/demo/threejs/07-inspection-report",
  //   level: "高级",
  //   topics: ["useFrame 动画", "相机 lerp 聚焦", "数据聚合统计", "良品率计算", "缺陷热力图"],
  // },
];

export default function ThreeJsDemosPage() {
  return (
    <div>
      {/* Demo 6 完整展示 */}
      <DefectInteraction />

      {/* 底部导航栏 - Demo 1-5 快速链接 */}
      <div className="border-t bg-background">
        <div className="px-6 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">Three.js IC载板复判系列</span>
              <span className="text-sm text-muted-foreground">- 从基础到进阶的完整学习路径</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {demos.map((demo) => {
                const Icon = demo.icon;
                return (
                  <Link key={demo.id} href={demo.href}>
                    <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-3 min-w-[200px] transition-all hover:bg-accent hover:border-primary hover:shadow-md">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">Demo {demo.id}</span>
                        <span className="text-xs text-muted-foreground">{demo.title}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
