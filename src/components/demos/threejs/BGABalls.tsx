"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Sphere } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GUI from "lil-gui";
import * as THREE from "three";

/**
 * Demo 3: BGA 焊球阵列渲染
 *
 * 学习要点：
 * 1. 独立 Mesh 渲染 - 每个焊球独立 Mesh，颜色通过 material color 直接驱动
 * 2. 状态着色 - 根据焊球状态（正常/缺失/桥接/虚焊）映射不同颜色
 * 3. Hover / Click 交互 - onPointerOver/Out/Click 实现高亮与选中
 * 4. BGA 封装结构 - Ball Grid Array 底部引脚阵列封装
 */

// ─── 焊球状态定义 ─────────────────────────────────────────────────────────────

type BallStatus = "ok" | "missing" | "bridge" | "cold" | "offset";

const BALL_COLORS: Record<BallStatus, string> = {
  ok: "#b0b8c8",
  missing: "#8B0000",
  bridge: "#ff3333",
  cold: "#ffaa00",
  offset: "#3388ff",
};

const BALL_LABELS: Record<BallStatus, string> = {
  ok: "正常",
  missing: "缺失",
  bridge: "桥连（短路）",
  cold: "虚焊（冷焊）",
  offset: "偏移",
};

// ─── 网格配置 ─────────────────────────────────────────────────────────────────

const ROWS = 8;
const COLS = 10;
const BALL_RADIUS = 1.8;
const PITCH = 5;
const BOARD_W = COLS * PITCH + 16;
const BOARD_D = ROWS * PITCH + 16;
const BALL_Y = BALL_RADIUS * 0.6;

// ─── 焊球数据（固定缺陷位置） ──────────────────────────────────────────────────

type BallInfo = {
  index: number;
  row: number;
  col: number;
  netName: string;
  status: BallStatus;
  position: [number, number, number];
};

// 固定每种缺陷各 1 个，位置固定
const FIXED_DEFECTS: Record<number, BallStatus> = {
  3:  "missing",  // A4
  17: "bridge",   // B8
  42: "cold",     // E3
  61: "offset",   // G2
};

const BALLS: BallInfo[] = (() => {
  const result: BallInfo[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const index = r * COLS + c;
      result.push({
        index,
        row: r,
        col: c,
        netName: `${String.fromCharCode(65 + r)}${c + 1}`,
        status: FIXED_DEFECTS[index] ?? "ok",
        position: [
          (c - (COLS - 1) / 2) * PITCH,
          BALL_Y,
          (r - (ROWS - 1) / 2) * PITCH,
        ],
      });
    }
  }
  return result;
})();

// ─── 单个焊球 ─────────────────────────────────────────────────────────────────

function Ball({
  ball,
  isHovered,
  isSelected,
  onHover,
  onSelect,
}: {
  ball: BallInfo;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (idx: number | null) => void;
  onSelect: (idx: number) => void;
}) {
  const color = isSelected ? "#ffd700" : isHovered ? "#ffffff" : BALL_COLORS[ball.status];

  return (
    <Sphere
      args={[BALL_RADIUS, 20, 14]}
      position={ball.position}
      onPointerOver={(e) => { e.stopPropagation(); onHover(ball.index); }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); onSelect(ball.index); }}
    >
      <meshStandardMaterial color={color} roughness={0.25} metalness={0.75} />
    </Sphere>
  );
}

// ─── PCB 底板 ─────────────────────────────────────────────────────────────────

function PcbBoard() {
  return (
    <group>
      <mesh position={[0, -1, 0]} receiveShadow>
        <boxGeometry args={[BOARD_W, 2, BOARD_D]} />
        <meshStandardMaterial color="#1a5c2a" roughness={0.8} metalness={0.05} />
      </mesh>
      <lineSegments position={[0, 0.02, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(COLS * PITCH + 2, 0.01, ROWS * PITCH + 2)]} />
        <lineBasicMaterial color="#33aa55" />
      </lineSegments>
    </group>
  );
}

// ─── 行列参考标尺 ──────────────────────────────────────────────────────────────

function RulerLabels() {
  const elems: React.ReactNode[] = [];
  const y = BALL_Y * 2 + 2;
  for (let c = 0; c < COLS; c++) {
    const x = (c - (COLS - 1) / 2) * PITCH;
    elems.push(
      <Text key={`col-${c}`} position={[x, y, -(ROWS * PITCH) / 2 - 5]} fontSize={2} color="#aaaaaa" anchorX="center">
        {c + 1}
      </Text>
    );
  }
  for (let r = 0; r < ROWS; r++) {
    const z = (r - (ROWS - 1) / 2) * PITCH;
    elems.push(
      <Text key={`row-${r}`} position={[-(COLS * PITCH) / 2 - 5, y, z]} fontSize={2} color="#aaaaaa" anchorX="center">
        {String.fromCharCode(65 + r)}
      </Text>
    );
  }
  return <group>{elems}</group>;
}

// ─── 场景 ─────────────────────────────────────────────────────────────────────

function Scene({
  lightIntensity,
  selected,
  onSelect,
}: {
  lightIntensity: number;
  selected: number | null;
  onSelect: (idx: number | null) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredBall = hovered !== null ? (BALLS.find((b) => b.index === hovered) ?? null) : null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 80, 50]} intensity={lightIntensity} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} />
      <pointLight position={[-30, 40, -30]} intensity={0.5} />

      <PcbBoard />

      {BALLS.map((ball) => (
        <Ball
          key={ball.index}
          ball={ball}
          isHovered={hovered === ball.index}
          isSelected={selected === ball.index}
          onHover={setHovered}
          onSelect={onSelect}
        />
      ))}

      <RulerLabels />

      {hoveredBall && (
        <Text
          position={[0, BALL_Y * 2 + 8, 0]}
          fontSize={2.5}
          color={BALL_COLORS[hoveredBall.status]}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.15}
          outlineColor="#000000"
        >
          {`${hoveredBall.netName}  ${BALL_LABELS[hoveredBall.status]}`}
        </Text>
      )}

      <OrbitControls enableDamping dampingFactor={0.05} minDistance={15} maxDistance={200} />
    </>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function BGABalls() {
  const [lightIntensity, setLightIntensity] = useState(1.5);
  const [selected, setSelected] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedBall = selected !== null ? (BALLS.find((b) => b.index === selected) ?? null) : null;
  const totalBalls = ROWS * COLS;

  useEffect(() => {
    if (!canvasRef.current) return;
    const gui = new GUI({ title: "BGA 控制", container: canvasRef.current });
    gui.domElement.style.cssText = "position:absolute;top:10px;right:10px;left:auto;";
    const params = { lightIntensity };
    gui.add(params, "lightIntensity", 0, 3, 0.1).name("光照强度").onChange((v: number) => setLightIntensity(v));
    return () => gui.destroy();
  }, []);

  return (
    <div className="flex h-screen w-full flex-col gap-4 p-4 lg:flex-row">
      <div ref={canvasRef} className="relative flex-1 rounded-lg border bg-card shadow-sm">
        <Canvas camera={{ position: [0, 60, 50], fov: 45 }} shadows onClick={() => setSelected(null)}>
          <Suspense fallback={null}>
            <Scene lightIntensity={lightIntensity} selected={selected} onSelect={setSelected} />
          </Suspense>
        </Canvas>
      </div>

      <div className="w-full space-y-4 overflow-y-auto lg:w-96">
        <Card>
          <CardHeader>
            <CardTitle>Demo 3: BGA 焊球阵列渲染</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            BGA（Ball Grid Array）是高密度 IC 封装形式，底部均匀分布的焊球阵列作为 I/O 引脚。
            共 {totalBalls} 个焊球，其中 4 个固定缺陷球，其余均为正常球。
          </CardContent>
        </Card>

        <Card className={selectedBall ? "border-yellow-400" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>选中焊球</span>
              {selectedBall && (
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: BALL_COLORS[selectedBall.status] }} />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {selectedBall ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="text-lg font-bold">{selectedBall.netName}</p>
                    <p className="text-muted-foreground text-xs">网络名</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="text-lg font-bold">R{selectedBall.row + 1}C{selectedBall.col + 1}</p>
                    <p className="text-muted-foreground text-xs">行列位置</p>
                  </div>
                </div>
                <div
                  className="rounded-lg p-3 text-center font-semibold"
                  style={{ backgroundColor: BALL_COLORS[selectedBall.status] + "33", color: BALL_COLORS[selectedBall.status] }}
                >
                  {BALL_LABELS[selectedBall.status]}
                </div>
                <p className="text-muted-foreground text-xs text-center">点击空白处取消选中</p>
              </div>
            ) : (
              <p className="text-muted-foreground">点击 3D 视图中的焊球查看详情</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>当前 BGA 规格</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{totalBalls}</p>
              <p className="text-muted-foreground text-xs">总焊球数</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{ROWS} × {COLS}</p>
              <p className="text-muted-foreground text-xs">行 × 列</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{PITCH} mm</p>
              <p className="text-muted-foreground text-xs">焊球间距 (Pitch)</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{BALL_RADIUS * 2} mm</p>
              <p className="text-muted-foreground text-xs">焊球直径</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>焊球缺陷类型</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(Object.entries(BALL_LABELS) as [BallStatus, string][]).map(([status, label]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: BALL_COLORS[status], boxShadow: `0 0 0 1px ${BALL_COLORS[status]}66` }} />
                <span className="font-medium" style={{ color: BALL_COLORS[status] }}>{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
