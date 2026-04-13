"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { Suspense, useEffect, useRef, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GUI from "lil-gui";
import * as THREE from "three";

/**
 * Demo 4: IC 载板 pcs 网格渲染与序号标注
 *
 * 学习要点：
 * 1. InstancedMesh - 用单次 draw call 渲染大量相同几何体，性能远优于独立 mesh
 * 2. 网格布局计算 - 根据行列数、间距自动计算每个 pcs 的世界坐标
 * 3. Text 序号标注 - 为每个 pcs 渲染行列编号
 * 4. Group 分组 - 将基板、网格线、序号标签组织为逻辑层级
 * 5. 坐标映射 - 从逻辑行列号映射到三维世界坐标
 *
 * IC 载板结构说明：
 * - Strip（大板）：整张 IC 载板，包含若干行列的 pcs
 * - pcs（pieces/Unit）：载板上的最小检测单元，每个 pcs 是一块独立的小方块
 * - 每个 pcs 有唯一序号，用于追踪检测结果
 */

// ─── 网格配置 ─────────────────────────────────────────────────────────────────

const ROWS = 4;         // Strip 行数
const COLS = 6;         // Strip 列数
const PCS_W = 20;       // 单个 pcs 宽度（mm）
const PCS_D = 15;       // 单个 pcs 深度（mm）
const GAP = 2;          // pcs 间距（mm）

// Strip 整体尺寸（含边框）
const BORDER = 8;
const STRIP_W = COLS * PCS_W + (COLS - 1) * GAP + BORDER * 2;
const STRIP_D = ROWS * PCS_D + (ROWS - 1) * GAP + BORDER * 2;

// ─── 工具：计算第 (row, col) 个 pcs 的中心坐标 ──────────────────────────────

function getPcsCenter(row: number, col: number): [number, number, number] {
  const startX = -(STRIP_W / 2) + BORDER + PCS_W / 2;
  const startZ = -(STRIP_D / 2) + BORDER + PCS_D / 2;
  const x = startX + col * (PCS_W + GAP);
  const z = startZ + row * (PCS_D + GAP);
  return [x, 2.1, z]; // Y=2.1：pcs 平面稍高于基板表面
}

// ─── 生成所有 pcs 数据 ────────────────────────────────────────────────────────

type PcsInfo = {
  index: number;               // 1-based 全局序号
  row: number;                 // 0-based 行号
  col: number;                 // 0-based 列号
  label: string;               // 显示标签，如 "R1C3" 或纯数字 "15"
  center: [number, number, number];
};

function generatePcsGrid(labelMode: "index" | "rowcol"): PcsInfo[] {
  const result: PcsInfo[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const index = r * COLS + c + 1;
      result.push({
        index,
        row: r,
        col: c,
        label: labelMode === "index" ? String(index) : `X${r + 1}Y${c + 1}`,
        center: getPcsCenter(r, c),
      });
    }
  }
  return result;
}

// ─── Strip 基板 ───────────────────────────────────────────────────────────────

function StripBoard() {
  return (
    <group>
      {/* 基板主体（ABF 树脂，棕色） */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[STRIP_W, 2, STRIP_D]} />
        <meshStandardMaterial color="#5c3d1e" roughness={0.6} metalness={0.05} />
      </mesh>

      {/* 边框刻度线（浅色轮廓） */}
      <lineSegments position={[0, 2.05, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(STRIP_W, 0.01, STRIP_D)]} />
        <lineBasicMaterial color="#8a6040" />
      </lineSegments>
    </group>
  );
}

// ─── pcs 网格（使用独立 mesh 便于后续扩展交互） ───────────────────────────────

function PcsGrid({
  pcsData,
  showLabel,
  labelSize,
  hovered,
  onHover,
}: {
  pcsData: PcsInfo[];
  showLabel: boolean;
  labelSize: number;
  hovered: number | null;
  onHover: (idx: number | null) => void;
}) {
  return (
    <group>
      {pcsData.map((pcs) => {
        const isHovered = hovered === pcs.index;
        return (
          <group
            key={pcs.index}
            position={pcs.center}
            onPointerOver={(e) => { e.stopPropagation(); onHover(pcs.index); }}
            onPointerOut={() => onHover(null)}
          >
            {/* pcs 表面（扁平矩形） */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[PCS_W - 0.5, PCS_D - 0.5]} />
              <meshStandardMaterial
                color={isHovered ? "#a0c4ff" : "#c8a96e"}
                roughness={0.5}
                metalness={0.1}
                emissive={isHovered ? "#4488cc" : "#000000"}
                emissiveIntensity={isHovered ? 0.4 : 0}
              />
            </mesh>

            {/* pcs 边框线 */}
            <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
              <edgesGeometry args={[new THREE.PlaneGeometry(PCS_W - 0.5, PCS_D - 0.5)]} />
              <lineBasicMaterial color="#6b4f2a" />
            </lineSegments>

            {/* 序号标签 */}
            {showLabel && (
              <Text
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.5, 0]}
                fontSize={labelSize}
                color={isHovered ? "#ffffff" : "#3a2a10"}
                anchorX="center"
                anchorY="middle"
                maxWidth={PCS_W - 2}
              >
                {pcs.label}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ─── 行列参考标尺（外侧序号） ─────────────────────────────────────────────────

function RulerLabels() {
  const elems: React.ReactNode[] = [];
  const y = 2.5;

  // 列序号（顶部）
  for (let c = 0; c < COLS; c++) {
    const [x, , z] = getPcsCenter(0, c);
    elems.push(
      <Text key={`col-${c}`} position={[x, y, -(STRIP_D / 2) - 4]} fontSize={3} color="#888888" anchorX="center">
        {c + 1}
      </Text>
    );
  }

  // 行序号（左侧）
  for (let r = 0; r < ROWS; r++) {
    const [, , z] = getPcsCenter(r, 0);
    elems.push(
      <Text key={`row-${r}`} position={[-(STRIP_W / 2) - 5, y, getPcsCenter(r, 0)[2]]} fontSize={3} color="#888888" anchorX="center">
        {r + 1}
      </Text>
    );
  }

  return <group>{elems}</group>;
}

// ─── 地面 ─────────────────────────────────────────────────────────────────────

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#e8e8e8" />
    </mesh>
  );
}

// ─── 场景 ─────────────────────────────────────────────────────────────────────

function Scene({
  lightIntensity,
  showLabel,
  labelMode,
  labelSize,
}: {
  lightIntensity: number;
  showLabel: boolean;
  labelMode: "index" | "rowcol";
  labelSize: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const pcsData = useMemo(() => generatePcsGrid(labelMode), [labelMode]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[80, 120, 80]}
        intensity={lightIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
      />
      <pointLight position={[-60, 80, -60]} intensity={0.3} />

      <StripBoard />
      <PcsGrid
        pcsData={pcsData}
        showLabel={showLabel}
        labelSize={labelSize}
        hovered={hovered}
        onHover={setHovered}
      />
      <RulerLabels />
      <Floor />

      <OrbitControls enableDamping dampingFactor={0.05} minDistance={40} maxDistance={400} />
    </>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function ICComponents() {
  const [lightIntensity, setLightIntensity] = useState(1.2);
  const [showLabel, setShowLabel] = useState(true);
  const [labelMode, setLabelMode] = useState<"index" | "rowcol">("index");
  const [labelSize, setLabelSize] = useState(3.5);
  const canvasRef = useRef<HTMLDivElement>(null);

  const totalPcs = ROWS * COLS;

  useEffect(() => {
    if (!canvasRef.current) return;

    const gui = new GUI({ title: "pcs 网格控制", container: canvasRef.current });
    gui.domElement.style.cssText = "position:absolute;top:10px;right:10px;left:auto;";

    const params = { lightIntensity, showLabel, labelMode, labelSize };

    gui.add(params, "lightIntensity", 0, 3, 0.1).name("光照强度").onChange((v: number) => setLightIntensity(v));

    const labelFolder = gui.addFolder("序号标注");
    labelFolder.add(params, "showLabel").name("显示序号").onChange((v: boolean) => setShowLabel(v));
    labelFolder.add(params, "labelMode", { "全局序号 (1~N)": "index", "行列坐标 (XaYb)": "rowcol" })
      .name("标注模式").onChange((v: "index" | "rowcol") => setLabelMode(v));
    labelFolder.add(params, "labelSize", 1, 6, 0.5).name("字号大小").onChange((v: number) => setLabelSize(v));
    labelFolder.open();

    return () => gui.destroy();
  }, []);

  return (
    <div className="flex h-screen w-full flex-col gap-4 p-4 lg:flex-row">
      {/* 左侧：3D 渲染区域 */}
      <div ref={canvasRef} className="relative flex-1 rounded-lg border bg-card shadow-sm">
        <Canvas camera={{ position: [0, 120, 100], fov: 45 }} shadows>
          <Suspense fallback={null}>
            <Scene
              lightIntensity={lightIntensity}
              showLabel={showLabel}
              labelMode={labelMode}
              labelSize={labelSize}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* 右侧：说明文档 */}
      <div className="w-full space-y-4 overflow-y-auto lg:w-96">
        <Card>
          <CardHeader>
            <CardTitle>Demo 4: IC 载板 pcs 网格渲染</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            IC 载板（Strip）被划分为固定行列的 pcs（Unit）网格，每个 pcs 是最小检测单元，拥有唯一序号，用于追踪缺陷检测结果。
          </CardContent>
        </Card>

        {/* Strip 参数说明 */}
        <Card>
          <CardHeader><CardTitle>当前 Strip 规格</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{totalPcs}</p>
              <p className="text-muted-foreground text-xs">总 pcs 数</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{ROWS} × {COLS}</p>
              <p className="text-muted-foreground text-xs">行 × 列</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{PCS_W} × {PCS_D}</p>
              <p className="text-muted-foreground text-xs">单 pcs 尺寸 (mm)</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{GAP}</p>
              <p className="text-muted-foreground text-xs">pcs 间距 (mm)</p>
            </div>
          </CardContent>
        </Card>

        {/* 核心概念 */}
        <Card>
          <CardHeader><CardTitle>核心概念</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <h3 className="font-semibold">1. Strip / pcs 结构</h3>
              <p className="text-muted-foreground">
                Strip 是整张 IC 载板大板，按固定行列切分为若干 pcs（pieces）。
                每个 pcs 是一个独立的检测单元，有唯一序号，对应 MES 系统中的检测记录。
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="font-semibold">2. 坐标映射公式</h3>
              <p className="text-muted-foreground">从逻辑行列号映射到世界坐标：</p>
              <pre className="bg-muted mt-1 rounded p-2 text-xs overflow-x-auto">{`const startX = -(STRIP_W / 2) + BORDER + PCS_W / 2;
const x = startX + col * (PCS_W + GAP);
const z = startZ + row * (PCS_D + GAP);`}</pre>
            </div>

            <div className="space-y-1">
              <h3 className="font-semibold">3. useMemo 缓存数据</h3>
              <p className="text-muted-foreground">
                pcs 网格数据在切换标注模式时才重新计算，避免每帧重建：
              </p>
              <pre className="bg-muted mt-1 rounded p-2 text-xs">{`const pcsData = useMemo(
  () => generatePcsGrid(labelMode),
  [labelMode]
);`}</pre>
            </div>

            <div className="space-y-1">
              <h3 className="font-semibold">4. 两种序号模式</h3>
              <ul className="text-muted-foreground ml-3 list-disc space-y-0.5 text-xs">
                <li><strong>全局序号</strong>：1 → N，从左到右、从上到下连续编号</li>
                <li><strong>行列坐标</strong>：X1Y1、X2Y3，直观定位 pcs 位置</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>工业应用场景</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground text-sm space-y-1">
            <p>在 IC 载板故障检测软件中，pcs 网格是所有可视化的基础：</p>
            <ul className="ml-3 list-disc space-y-1">
              <li>检测机台按 pcs 序号上报检测结果到 MES</li>
              <li>3D 视图按序号定位并高亮缺陷 pcs</li>
              <li>统计每批次各 pcs 的良率分布</li>
              <li>追踪同一 pcs 在多道工序中的质量变化</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>练习建议</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-sm">
            <p>✅ 修改 ROWS / COLS，模拟不同规格的 Strip</p>
            <p>✅ 调整 PCS_W / PCS_D / GAP，模拟不同 pcs 尺寸</p>
            <p>✅ 添加 onClick 事件，记录当前选中的 pcs 序号</p>
            <p>✅ 为 pcs 添加框选（Shift+Click）功能</p>
            <p>✅ 将 InstancedMesh 替换当前独立 mesh，测试性能差异</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
