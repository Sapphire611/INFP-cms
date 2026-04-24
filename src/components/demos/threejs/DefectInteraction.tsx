"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import { Suspense, useEffect, useRef, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GUI from "lil-gui";
import * as THREE from "three";

/**
 * Demo 6: 缺陷交互与详情展示
 *
 * 学习要点：
 * 1. 键盘导航 - 上下左右键选择 PCS，带高亮显示
 * 2. 快捷键复判 - Enter=OK, 0=NG
 * 3. 复判流程 - 自动跳过 ET 缺陷，遍历所有待复判项
 * 4. 状态管理 - 追踪复判进度和结果
 * 5. 图片展示 - 显示缺陷图片（模拟）
 */

// ─── 网格配置 ─────────────────────────────────────────────────────────────────

const BASE_ROWS = 20; // Strip 基础行数（旋转前）
const BASE_COLS = 6; // Strip 基础列数（旋转前）
const PCS_W = 20; // 单个 pcs 宽度（mm）
const PCS_D = 15; // 单个 pcs 深度（mm）
const GAP = 2; // pcs 间距（mm）

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

type DefectType = "金面划伤" | "开路" | "短路" | "阻焊偏移" | "铜面氧化" | "线路断裂" | "孔位偏移" | "表面污染";

// 缺陷状态颜色映射
const STATUS_COLORS: Record<DefectStatus, string> = {
  OK: "#22c55e", // 绿色
  待复判: "#eab308", // 黄色（默认）
  NG: "#ef4444", // 红色
  前道不良ET: "#ffffff", // 白色
};

// 缺陷类型颜色映射（用于区分不同缺陷）
const DEFECT_TYPE_COLORS: Record<DefectType, string> = {
  金面划伤: "#f97316", // 橙色
  开路: "#8b5cf6", // 紫色
  短路: "#ec4899", // 粉色
  阻焊偏移: "#06b6d4", // 青色
  铜面氧化: "#84cc16", // 黄绿色
  线路断裂: "#dc2626", // 深红色
  孔位偏移: "#0ea5e9", // 蓝色
  表面污染: "#a855f7", // 紫罗兰色
};

// ─── PCS 数据结构 ─────────────────────────────────────────────────────────────

interface PcsData {
  id: number;
  row: number;
  col: number;
  status: DefectStatus;
  defectType?: DefectType;
  defectCount?: number;
  x: number;
  z: number;
}

// ─── 生成模拟缺陷数据 ─────────────────────────────────────────────────────────

function generateDefectData(rotation: RotationAngle): PcsData[] {
  const { rows, cols, pcsWidth, pcsDepth } = getLayoutConfig(rotation);
  const data: PcsData[] = [];

  const defectTypes: DefectType[] = [
    "金面划伤",
    "开路",
    "短路",
    "阻焊偏移",
    "铜面氧化",
    "线路断裂",
    "孔位偏移",
    "表面污染",
  ];

  const statuses: DefectStatus[] = ["OK", "待复判", "NG", "前道不良ET"];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const id = row * cols + col + 1;

      // 70% 概率有缺陷
      const hasDefect = Math.random() < 0.7;

      let status: DefectStatus = "OK";
      let defectType: DefectType | undefined;
      let defectCount: number | undefined;

      if (hasDefect) {
        status = statuses[Math.floor(Math.random() * statuses.length)];
        defectType = defectTypes[Math.floor(Math.random() * defectTypes.length)];
        defectCount = Math.floor(Math.random() * 5) + 1;
      }

      // 计算 pcs 中心位置
      const x = col * (pcsWidth + GAP) - ((cols - 1) * (pcsWidth + GAP)) / 2;
      const z = row * (pcsDepth + GAP) - ((rows - 1) * (pcsDepth + GAP)) / 2;

      data.push({ id, row, col, status, defectType, defectCount, x, z });
    }
  }

  return data;
}

// ─── PCS 网格组件 ─────────────────────────────────────────────────────────────

interface PcsGridProps {
  data: PcsData[];
  rotation: RotationAngle;
  selectedId: number | null;
  onSelect: (id: number) => void;
  colorMode: "status" | "defectType";
}

function PcsGrid({ data, rotation, selectedId, onSelect, colorMode }: PcsGridProps) {
  const { pcsWidth, pcsDepth } = getLayoutConfig(rotation);

  return (
    <group>
      {data.map((pcs) => {
        // 根据颜色模式选择颜色
        const color = useMemo(() => {
          if (colorMode === "status") {
            return STATUS_COLORS[pcs.status];
          } else {
            // 缺陷类型模式：OK 显示绿色，其他显示缺陷类型颜色
            if (pcs.status === "OK") return STATUS_COLORS["OK"];
            return pcs.defectType ? DEFECT_TYPE_COLORS[pcs.defectType] : STATUS_COLORS["待复判"];
          }
        }, [pcs, colorMode]);

        const isSelected = pcs.id === selectedId;

        return (
          <group key={pcs.id} position={[pcs.x, 2, pcs.z]}>
            {/* PCS 主体 */}
            <mesh
              castShadow
              onClick={() => onSelect(pcs.id)}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "default";
              }}
            >
              <boxGeometry args={[pcsWidth, 1, pcsDepth]} />
              <meshStandardMaterial
                color={color}
                emissive={isSelected ? color : "#000000"}
                emissiveIntensity={isSelected ? 0.3 : 0}
                metalness={0.2}
                roughness={0.6}
              />
            </mesh>

            {/* 选中高亮边框 */}
            {isSelected && (
              <lineSegments position={[0, 0.6, 0]}>
                <edgesGeometry args={[new THREE.BoxGeometry(pcsWidth + 1, 1.5, pcsDepth + 1)]} />
                <lineBasicMaterial color="#ffffff" linewidth={3} />
              </lineSegments>
            )}

            {/* PCS 编号 */}
            <Text
              position={[0, 0.6, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={3}
              color="#000000"
              anchorX="center"
              anchorY="middle"
            >
              {pcs.id}
            </Text>
          </group>
        );
      })}
    </group>
  );
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
        <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(boardW, 2, boardD)]} />
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

// ─── 3D 场景组件 ──────────────────────────────────────────────────────────────

interface SceneProps {
  data: PcsData[];
  rotation: RotationAngle;
  selectedId: number | null;
  onSelect: (id: number) => void;
  colorMode: "status" | "defectType";
}

function Scene({ data, rotation, selectedId, onSelect, colorMode }: SceneProps) {
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

      <Suspense fallback={null}>
        <StripBoard rotation={rotation} />
        <PcsGrid data={data} rotation={rotation} selectedId={selectedId} onSelect={onSelect} colorMode={colorMode} />
      </Suspense>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={50}
        maxDistance={300}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function DefectInteraction() {
  const [rotation, setRotation] = useState<RotationAngle>(0);
  const [colorMode, setColorMode] = useState<"status" | "defectType">("status");
  const [data, setData] = useState<PcsData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewedData, setReviewedData] = useState<Map<number, DefectStatus>>(new Map());

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // 初始化数据
  useEffect(() => {
    const newData = generateDefectData(rotation);
    setData(newData);

    // 自动选择第一个待复判的非ET缺陷
    const firstPending = newData.find((p) => p.status === "待复判" && !reviewedData.has(p.id));
    if (firstPending) {
      setSelectedId(firstPending.id);
    }
  }, [rotation]);

  // 获取当前选中的 PCS 数据
  const selectedPcs = useMemo(() => {
    return data.find((p) => p.id === selectedId);
  }, [data, selectedId]);

  // 获取需要复判的 PCS 列表（排除 ET 和已复判）
  const pendingReview = useMemo(() => {
    return data.filter((p) => p.status === "待复判" && !reviewedData.has(p.id));
  }, [data, reviewedData]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPcs) return;

      const { rows, cols } = getLayoutConfig(rotation);
      const { row, col } = selectedPcs;

      let newRow = row;
      let newCol = col;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newRow = Math.max(0, row - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newRow = Math.min(rows - 1, row + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          newCol = Math.max(0, col - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newCol = Math.min(cols - 1, col + 1);
          break;
        case "Enter":
          e.preventDefault();
          handleReview("OK");
          return;
        case "0":
          e.preventDefault();
          handleReview("NG");
          return;
      }

      // 计算新的 ID
      if (newRow !== row || newCol !== col) {
        const newId = newRow * cols + newCol + 1;
        setSelectedId(newId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPcs, rotation]);

  // 处理复判
  const handleReview = (result: "OK" | "NG") => {
    if (!selectedPcs || selectedPcs.status === "前道不良ET") return;

    // 记录复判结果
    const newReviewed = new Map(reviewedData);
    newReviewed.set(selectedPcs.id, result);
    setReviewedData(newReviewed);

    // 更新数据中的状态
    setData((prev) => prev.map((p) => (p.id === selectedPcs.id ? { ...p, status: result } : p)));

    // 自动跳转到下一个待复判项
    const remaining = data.filter((p) => p.status === "待复判" && !newReviewed.has(p.id) && p.id !== selectedPcs.id);

    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
    }
  };

  // lil-gui 控制面板
  useEffect(() => {
    const gui = new GUI({ title: "Demo 6 控制面板" });

    // 将 GUI 挂载到 Canvas 容器内
    if (canvasContainerRef.current) {
      const guiDom = gui.domElement;
      guiDom.style.position = "absolute";
      guiDom.style.top = "10px";
      guiDom.style.right = "10px";
      canvasContainerRef.current.appendChild(guiDom);
    }

    const params = {
      colorMode: "status",
      rotation: rotation,
      regenerate: () => {
        const newData = generateDefectData(rotation);
        setData(newData);
        setReviewedData(new Map());
        const firstPending = newData.find((p) => p.status === "待复判");
        if (firstPending) setSelectedId(firstPending.id);
      },
    };

    gui
      .add(params, "colorMode", ["status", "defectType"])
      .name("颜色模式")
      .onChange((value: string) => {
        setColorMode(value as "status" | "defectType");
      });

    gui
      .add(params, "rotation", [0, 90, 180, 270])
      .name("料号旋转")
      .onChange((value: RotationAngle) => {
        setRotation(value);
        setReviewedData(new Map());
      });

    gui.add(params, "regenerate").name("重新生成数据");

    return () => gui.destroy();
  }, [rotation, canvasContainerRef]);

  // 生成模拟缺陷图片 URL
  const getDefectImageUrl = (pcs: PcsData) => {
    // 使用 placeholder 图片服务
    const seed = pcs.id;
    return `https://picsum.photos/seed/${seed}/400/300`;
  };

  const progress =
    data.length > 0 ? ((reviewedData.size / data.filter((p) => p.status === "待复判").length) * 100).toFixed(1) : 0;

  return (
    <div className="flex h-screen w-full gap-4 bg-background p-4">
      {/* 左侧 3D 视图 */}
      <div
        ref={canvasContainerRef}
        className="flex-1 overflow-hidden rounded-lg border border-border"
        style={{ position: "relative" }}
      >
        <Canvas camera={{ position: [0, 100, 150], fov: 50 }}>
          <Scene
            data={data}
            rotation={rotation}
            selectedId={selectedId}
            onSelect={setSelectedId}
            colorMode={colorMode}
          />
        </Canvas>
      </div>

      {/* 右侧信息面板 */}
      <div className="flex w-96 flex-col gap-4 h-full overflow-y-auto">
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle>复判进度</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            {/* <p>基于 Demo 5 的缺陷数据，实现人工复判流程</p> */}
            <div className="flex gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: STATUS_COLORS.OK }}></div>
                <span>OK</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: STATUS_COLORS.待复判 }}></div>
                <span>待复判</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: STATUS_COLORS.NG }}></div>
                <span>NG</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: STATUS_COLORS.前道不良ET }}></div>
                <span>ET</span>
              </div>
            </div>
          </CardContent>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>待复判: {pendingReview.length}</span>
                <span>已复判: {reviewedData.size}</span>
              </div>
              <div className="bg-secondary h-2 w-full rounded-full">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-muted-foreground text-center text-xs">{progress}% 完成</p>
            </div>
          </CardContent>
        </Card>

        {selectedPcs && (
          <Card className="flex-shrink-0">
            <CardHeader>
              <CardTitle>PCS #{selectedPcs.id} 详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">位置:</span>
                  <span className="ml-2">
                    行{selectedPcs.row + 1} 列{selectedPcs.col + 1}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">状态:</span>
                  <span className="ml-2">{selectedPcs.status}</span>
                </div>
                {selectedPcs.defectType && (
                  <>
                    <div>
                      <span className="text-muted-foreground">缺陷类型:</span>
                      <span className="ml-2">{selectedPcs.defectType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">缺陷数量:</span>
                      <span className="ml-2">{selectedPcs.defectCount}</span>
                    </div>
                  </>
                )}
              </div>

              {/* 缺陷图片 */}
              {selectedPcs.defectType && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">缺陷图片:</p>
                  <img
                    src={getDefectImageUrl(selectedPcs)}
                    alt={`PCS ${selectedPcs.id} 缺陷图片`}
                    className="w-full rounded border border-border h-53 object-cover"
                  />
                </div>
              )}

              {/* 复判按钮 */}
              {selectedPcs.status === "待复判" && !reviewedData.has(selectedPcs.id) && (
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => handleReview("OK")} className="flex-1 bg-green-600 hover:bg-green-700">
                    OK (Enter)
                  </Button>
                  <Button onClick={() => handleReview("NG")} className="flex-1 bg-red-600 hover:bg-red-700">
                    NG (0)
                  </Button>
                </div>
              )}

              {selectedPcs.status === "前道不良ET" && (
                <p className="text-muted-foreground py-2 text-center text-sm">ET 缺陷无需复判</p>
              )}

              {reviewedData.has(selectedPcs.id) && (
                <p className="py-2 text-center text-sm text-green-600">✓ 已复判为 {reviewedData.get(selectedPcs.id)}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* <Card>
          <CardHeader>
            <CardTitle>缺陷类型颜色</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(DEFECT_TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: color }}></div>
                <span className="text-sm">{type}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>键盘快捷键</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">↑↓←→</span>
              <span>选择 PCS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Enter</span>
              <span>标记为 OK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">0</span>
              <span>标记为 NG</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>技术要点</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <div>
              <h3 className="text-foreground font-semibold">1. 键盘导航</h3>
              <p className="text-xs">监听 keydown 事件，计算相邻 PCS 的行列索引</p>
            </div>
            <div>
              <h3 className="text-foreground font-semibold">2. 选中高亮</h3>
              <p className="text-xs">使用 emissive 材质和边框线段实现高亮效果</p>
            </div>
            <div>
              <h3 className="text-foreground font-semibold">3. 状态管理</h3>
              <p className="text-xs">Map 结构追踪复判结果，自动跳转下一项</p>
            </div>
            <div>
              <h3 className="text-foreground font-semibold">4. 图片展示</h3>
              <p className="text-xs">使用 placeholder 服务模拟缺陷图片</p>
            </div>
          </CardContent>
        </Card> */}

        {pendingReview.length === 0 && reviewedData.size > 0 && (
          <Card className="border-green-600">
            <CardContent className="pt-6">
              <p className="text-center font-semibold text-green-600">🎉 所有缺陷已复判完成！</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
