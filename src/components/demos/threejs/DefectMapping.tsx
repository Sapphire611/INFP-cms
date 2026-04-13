"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import { Suspense, useEffect, useRef, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GUI from "lil-gui";
import * as THREE from "three";

/**
 * Demo 5: 缺陷数据绑定与颜色映射
 *
 * 学习要点：
 * 1. 缺陷状态映射 - OK/待复判/NG/前道不良ET 四种状态的颜色编码
 * 2. 真实缺陷类型 - 金面划伤、开路、短路、阻焊偏移等工业缺陷
 * 3. 交互式悬浮提示 - 鼠标悬浮显示详细缺陷信息
 * 4. 数据驱动渲染 - 从缺陷数据自动生成颜色和标签
 * 5. 独立 Mesh 事件 - 每个 pcs 独立响应鼠标事件
 */

// ─── 网格配置 ─────────────────────────────────────────────────────────────────

const BASE_ROWS = 20;   // Strip 基础行数（旋转前）
const BASE_COLS = 6;    // Strip 基础列数（旋转前）
const PCS_W = 20;       // 单个 pcs 宽度（mm）
const PCS_D = 15;       // 单个 pcs 深度（mm）
const GAP = 2;          // pcs 间距（mm）

// 料号旋转角度选项
type RotationAngle = 0 | 90 | 180 | 270;

// 根据旋转角度计算实际行列数和尺寸
function getLayoutConfig(rotation: RotationAngle) {
  const is90or270 = rotation === 90 || rotation === 270;
  return {
    rows: is90or270 ? BASE_COLS : BASE_ROWS,
    cols: is90or270 ? BASE_ROWS : BASE_COLS,
    pcsWidth: is90or270 ? PCS_D : PCS_W,
    pcsDepth: is90or270 ? PCS_W : PCS_D,
  };
}

// Strip 整体尺寸（含边框）- 基于基础配置
const BORDER = 8;
const STRIP_W = BASE_COLS * PCS_W + (BASE_COLS - 1) * GAP + BORDER * 2;
const STRIP_D = BASE_ROWS * PCS_D + (BASE_ROWS - 1) * GAP + BORDER * 2;

// ─── 缺陷类型定义 ─────────────────────────────────────────────────────────────

type DefectStatus = "OK" | "待复判" | "NG" | "前道不良ET";

type DefectType =
  | "金面划伤"
  | "开路"
  | "短路"
  | "阻焊偏移"
  | "铜面氧化"
  | "线路断裂"
  | "孔位偏移"
  | "表面污染";

// 缺陷状态颜色映射
const STATUS_COLORS: Record<DefectStatus, string> = {
  "OK": "#22c55e",           // 绿色
  "待复判": "#eab308",       // 黄色（默认）
  "NG": "#ef4444",           // 红色
  "前道不良ET": "#ffffff",   // 白色
};

// 缺陷类型颜色映射（用于区分不同缺陷）
const DEFECT_TYPE_COLORS: Record<DefectType, string> = {
  "金面划伤": "#f97316",     // 橙色
  "开路": "#8b5cf6",         // 紫色
  "短路": "#ec4899",         // 粉色
  "阻焊偏移": "#06b6d4",     // 青色
  "铜面氧化": "#84cc16",     // 黄绿色
  "线路断裂": "#dc2626",     // 深红色
  "孔位偏移": "#0ea5e9",     // 蓝色
  "表面污染": "#a855f7",     // 紫罗兰色
};

// ─── pcs 数据结构 ─────────────────────────────────────────────────────────────

type PcsData = {
  index: number;
  row: number;
  col: number;
  label: string;
  center: [number, number, number];
  size: [number, number, number];
  rotation: number;
  status: DefectStatus;
  defectType?: DefectType;
  defectCount?: number;
};

// ─── 工具：根据旋转角度计算 pcs 的中心坐标和尺寸 ────────────────────────────

function getPcsTransform(
  row: number,
  col: number,
  rotation: RotationAngle
): {
  center: [number, number, number];
  size: [number, number, number];
  rotation: number;
  displayRow: number;
  displayCol: number;
} {
  const config = getLayoutConfig(rotation);
  const { rows, cols, pcsWidth, pcsDepth } = config;

  // 根据旋转角度确定基板尺寸
  const is90or270 = rotation === 90 || rotation === 270;
  const boardW = is90or270 ? STRIP_D : STRIP_W;
  const boardD = is90or270 ? STRIP_W : STRIP_D;

  const startX = -(boardW / 2) + BORDER + pcsWidth / 2;
  const startZ = -(boardD / 2) + BORDER + pcsDepth / 2;
  const x = startX + col * (pcsWidth + GAP);
  const z = startZ + row * (pcsDepth + GAP);

  // 计算显示用的行列号（保证从主视角看编号不变）
  let displayRow = row;
  let displayCol = col;

  switch (rotation) {
    case 90:
      // 顺时针90度：当前网格是 6行×20列，映射回原始 20行×6列 的编号
      // 当前位置 (r, c) 对应原始的 (c, 6-1-r)
      displayRow = col;
      displayCol = rows - 1 - row;
      break;
    case 180:
      // 顺时针180度：网格仍是 20行×6列
      displayRow = rows - 1 - row;
      displayCol = cols - 1 - col;
      break;
    case 270:
      // 顺时针270度：当前网格是 6行×20列，映射回原始 20行×6列 的编号
      // 当前位置 (r, c) 对应原始的 (20-1-c, r)
      displayRow = cols - 1 - col;
      displayCol = row;
      break;
  }

  return {
    center: [x, 2.1, z],
    size: [pcsWidth, 2, pcsDepth],
    rotation: 0, // pcs 本身不旋转，保持形态不变
    displayRow,
    displayCol,
  };
}

// ─── 生成模拟缺陷数据 ─────────────────────────────────────────────────────────

function generateDefectData(rotation: RotationAngle): PcsData[] {
  const result: PcsData[] = [];
  const defectTypes: DefectType[] = [
    "金面划伤", "开路", "短路", "阻焊偏移",
    "铜面氧化", "线路断裂", "孔位偏移", "表面污染"
  ];

  const config = getLayoutConfig(rotation);
  const { rows, cols } = config;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const transform = getPcsTransform(r, c, rotation);
      const index = r * cols + c + 1;
      const rand = Math.random();

      let status: DefectStatus;
      let defectType: DefectType | undefined;
      let defectCount: number | undefined;

      // 模拟缺陷分布：60% OK, 25% 待复判, 10% NG, 5% 前道不良ET
      if (rand < 0.6) {
        status = "OK";
      } else if (rand < 0.85) {
        status = "待复判";
        defectType = defectTypes[Math.floor(Math.random() * defectTypes.length)];
        defectCount = Math.floor(Math.random() * 3) + 1;
      } else if (rand < 0.95) {
        status = "NG";
        defectType = defectTypes[Math.floor(Math.random() * defectTypes.length)];
        defectCount = Math.floor(Math.random() * 5) + 3;
      } else {
        status = "前道不良ET";
        defectType = defectTypes[Math.floor(Math.random() * defectTypes.length)];
        defectCount = Math.floor(Math.random() * 2) + 1;
      }

      result.push({
        index,
        row: transform.displayRow,
        col: transform.displayCol,
        label: `X${transform.displayRow + 1}Y${transform.displayCol + 1}`,
        center: transform.center,
        size: transform.size,
        rotation: transform.rotation,
        status,
        defectType,
        defectCount,
      });
    }
  }
  return result;
}

// ─── Strip 基板 ───────────────────────────────────────────────────────────────

function StripBoard({ rotation }: { rotation: RotationAngle }) {
  const is90or270 = rotation === 90 || rotation === 270;
  const boardW = is90or270 ? STRIP_D : STRIP_W;
  const boardD = is90or270 ? STRIP_W : STRIP_D;

  return (
    <group>
      {/* 基板主体 */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[boardW, 2, boardD]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* 边框线 */}
      <lineSegments>
        <edgesGeometry
          attach="geometry"
          args={[new THREE.BoxGeometry(boardW, 2, boardD)]}
        />
        <lineBasicMaterial color="#666666" />
      </lineSegments>

      {/* 料号标签 */}
      <Text
        position={[0, 1.5, -boardD / 2 + 4]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        IC-STRIP-2026-001
      </Text>
    </group>
  );
}

// ─── 单个 pcs 组件 ────────────────────────────────────────────────────────────

type PcsUnitProps = {
  data: PcsData;
  colorMode: "status" | "defectType";
  onHover: (data: PcsData | null) => void;
};

function PcsUnit({ data, colorMode, onHover }: PcsUnitProps) {
  const [hovered, setHovered] = useState(false);

  // 根据模式选择颜色
  const color = useMemo(() => {
    if (colorMode === "status") {
      return STATUS_COLORS[data.status];
    } else {
      // 缺陷类型模式：OK 显示绿色，其他显示缺陷类型颜色
      if (data.status === "OK") return STATUS_COLORS["OK"];
      return data.defectType ? DEFECT_TYPE_COLORS[data.defectType] : STATUS_COLORS["待复判"];
    }
  }, [data, colorMode]);

  return (
    <group position={data.center} rotation={[0, data.rotation, 0]}>
      {/* pcs 方块 */}
      <mesh
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(data);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHover(null);
        }}
      >
        <boxGeometry args={data.size} />
        <meshStandardMaterial
          color={color}
          emissive={hovered ? color : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
          metalness={0.2}
          roughness={0.6}
        />
      </mesh>

      {/* 序号标签 */}
      <Text
        position={[0, 1.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {data.label}
      </Text>
    </group>
  );
}

// ─── pcs 网格 ─────────────────────────────────────────────────────────────────

type PcsGridProps = {
  colorMode: "status" | "defectType";
  onHover: (data: PcsData | null) => void;
  rotation: RotationAngle;
};

function PcsGrid({ colorMode, onHover, rotation }: PcsGridProps) {
  const pcsData = useMemo(() => generateDefectData(rotation), [rotation]);

  return (
    <group>
      {pcsData.map((data) => (
        <PcsUnit
          key={data.index}
          data={data}
          colorMode={colorMode}
          onHover={onHover}
        />
      ))}
    </group>
  );
}

// ─── 悬浮提示组件 ─────────────────────────────────────────────────────────────

type HoverTooltipProps = {
  data: PcsData | null;
};

function HoverTooltip({ data }: HoverTooltipProps) {
  if (!data) return null;

  return (
    <Html position={[data.center[0], data.center[1] + 15, data.center[2]]}>
      <div className="bg-black/90 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none">
        <div className="font-bold mb-1">{data.label} (#{data.index})</div>
        <div className="space-y-0.5">
          <div>状态: <span className="font-semibold">{data.status}</span></div>
          {data.defectType && (
            <>
              <div>缺陷类型: <span className="font-semibold">{data.defectType}</span></div>
              <div>缺陷数量: <span className="font-semibold">{data.defectCount}</span></div>
            </>
          )}
        </div>
      </div>
    </Html>
  );
}

// ─── 场景组件 ─────────────────────────────────────────────────────────────────

function Scene({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) {
  const [colorMode, setColorMode] = useState<"status" | "defectType">("status");
  const [hoveredPcs, setHoveredPcs] = useState<PcsData | null>(null);
  const [rotation, setRotation] = useState<RotationAngle>(90);

  // lil-gui 控制面板
  useEffect(() => {
    const gui = new GUI({ title: "Demo 5 控制面板" });

    // 将 GUI 挂载到 Canvas 容器内
    if (containerRef.current) {
      const guiDom = gui.domElement;
      guiDom.style.position = "absolute";
      guiDom.style.top = "10px";
      guiDom.style.right = "10px";
      containerRef.current.appendChild(guiDom);
    }

    const params = {
      colorMode: "status",
      rotation: 90,
    };

    gui.add(params, "colorMode", ["status", "defectType"])
      .name("颜色模式")
      .onChange((value: string) => {
        setColorMode(value as "status" | "defectType");
      });

    gui.add(params, "rotation", [0, 90, 180, 270])
      .name("料号旋转角度")
      .onChange((value: number) => {
        setRotation(value as RotationAngle);
      });

    return () => gui.destroy();
  }, [containerRef]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 80, 50]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />

      <StripBoard rotation={rotation} />
      <PcsGrid colorMode={colorMode} onHover={setHoveredPcs} rotation={rotation} />
      <HoverTooltip data={hoveredPcs} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={50}
        maxDistance={500}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function DefectMappingDemo() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-screen w-full gap-4 p-4">
      {/* 左侧 3D 视图 */}
      <div
        ref={canvasContainerRef}
        className="flex-1 rounded-lg border shadow-xl relative"
        style={{ backgroundColor: "#4a5568" }}
      >
        <Canvas
          camera={{ position: [0, 200, 300], fov: 50 }}
          shadows
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <Scene containerRef={canvasContainerRef} />
          </Suspense>
        </Canvas>
      </div>

      {/* 右侧说明面板 */}
      <div className="w-80 space-y-4 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle>Demo 5: 缺陷数据绑定与颜色映射</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>本 Demo 展示如何将真实缺陷数据绑定到 pcs 网格，并通过颜色编码快速识别问题区域。</p>
            <p className="text-xs">pcs 数量: 20 × 6 = 120 个</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>缺陷状态颜色</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.OK }}></div>
              <span className="text-sm">OK - 合格</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.待复判 }}></div>
              <span className="text-sm">待复判 - 需人工确认</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.NG }}></div>
              <span className="text-sm">NG - 不合格</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border" style={{ backgroundColor: STATUS_COLORS.前道不良ET }}></div>
              <span className="text-sm">前道不良ET - 前工序遗留</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>缺陷类型颜色</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(DEFECT_TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
                <span className="text-sm">{type}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>交互说明</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-sm">
            <p>🖱️ 鼠标悬浮 pcs 查看详细缺陷信息</p>
            <p>🎨 切换颜色模式查看不同维度的数据</p>
            <p>🔄 拖拽旋转视角，滚轮缩放</p>
            <p>🔀 调整料号旋转角度（0/90/180/270°）</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>技术要点</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground text-sm space-y-2">
            <div>
              <h3 className="font-semibold text-foreground">1. 数据驱动渲染</h3>
              <p className="text-xs">每个 pcs 携带状态和缺陷类型数据，颜色由数据自动映射</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">2. 独立 Mesh 事件</h3>
              <p className="text-xs">120 个 pcs 使用独立 mesh，每个都能响应鼠标事件</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">3. 料号旋转适配</h3>
              <p className="text-xs">支持 0/90/180/270° 旋转，自动调整 pcs 编号和长宽</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">4. 悬浮提示</h3>
              <p className="text-xs">使用 Html 组件在 3D 空间中渲染 2D 提示框</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>工业应用</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground text-sm space-y-1">
            <p>在 AOI/AVI 检测系统中：</p>
            <ul className="ml-3 list-disc space-y-1">
              <li>实时显示检测结果，快速定位问题区域</li>
              <li>按缺陷类型分类统计，分析工艺问题</li>
              <li>支持复判流程，人工确认可疑缺陷</li>
              <li>追溯前道工序遗留问题</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
