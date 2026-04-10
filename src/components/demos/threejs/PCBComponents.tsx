"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { Suspense, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GUI from "lil-gui";

/**
 * Demo 3: PCB 元器件渲染
 *
 * 学习要点：
 * 1. group - 将多个 mesh 组合成一个逻辑单元，统一管理位置/旋转/缩放
 * 2. onClick / onPointerOver - Three.js 的 Raycasting 交互事件
 * 3. emissive / emissiveIntensity - 自发光材质，用于高亮选中效果
 * 4. stopPropagation - 阻止事件冒泡，避免点击穿透
 * 5. 基础几何体组合 - 用 BoxGeometry、CylinderGeometry、SphereGeometry 拼装复杂元器件
 */

// ─── 类型定义 ────────────────────────────────────────────────────────────────

type ComponentType = "resistor" | "capacitor" | "ic" | "led" | "connector";

type ComponentInfo = {
  id: string;
  name: string;
  type: ComponentType;
  value: string;
  description: string;
  position: [number, number, number];
};

// ─── 元器件数据 ───────────────────────────────────────────────────────────────

const COMPONENTS: ComponentInfo[] = [
  { id: "R1", name: "R1", type: "resistor", value: "10kΩ", description: "上拉电阻，将信号线拉至高电平", position: [-35, 2, -18] },
  { id: "R2", name: "R2", type: "resistor", value: "4.7kΩ", description: "限流电阻，保护 LED 不被烧毁", position: [-35, 2, 0] },
  { id: "R3", name: "R3", type: "resistor", value: "1kΩ", description: "分压电阻，构成分压网络", position: [-35, 2, 18] },
  { id: "C1", name: "C1", type: "capacitor", value: "100μF/16V", description: "电解电容，电源滤波，稳定供电电压", position: [15, 2, -22] },
  { id: "C2", name: "C2", type: "capacitor", value: "10μF/16V", description: "去耦电容，滤除 IC 产生的高频噪声", position: [28, 2, -22] },
  { id: "U1", name: "U1", type: "ic", value: "ATmega328P", description: "主控 MCU，8位 AVR 架构，28引脚 DIP 封装", position: [0, 2, 5] },
  { id: "LED1", name: "LED1", type: "led", value: "红色 5mm", description: "电源指示灯，通电时常亮", position: [38, 2, -22] },
  { id: "LED2", name: "LED2", type: "led", value: "绿色 5mm", description: "状态指示灯，程序运行时闪烁", position: [38, 2, -8] },
  { id: "J1", name: "J1", type: "connector", value: "2.54mm 2×3", description: "ISP 编程接口，用于烧录固件", position: [-42, 2, 22] },
];

// ─── 共享 Props 类型 ──────────────────────────────────────────────────────────

type ComponentProps = {
  info: ComponentInfo;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  showLabel: boolean;
};

// ─── 电阻组件 ─────────────────────────────────────────────────────────────────

/**
 * 电阻 (Resistor)
 * 结构：陶瓷圆柱体 + 4条色环 + 两端金属引脚
 * 色环颜色对应阻值（棕黑橙金 = 10kΩ ±5%）
 */
function Resistor({ info, isSelected, isHovered, onSelect, onHover, showLabel }: ComponentProps) {
  const highlight = isSelected ? 0.6 : isHovered ? 0.25 : 0;
  const [x, , z] = info.position;

  return (
    <group
      position={[x, 3.2, z]}
      onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : info.id); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(info.id); }}
      onPointerOut={() => onHover(null)}
    >
      {/* 电阻体（水平放置，绕 Z 轴旋转 90°） */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.2, 1.2, 9, 16]} />
        <meshStandardMaterial color="#d4b896" roughness={0.8} emissive="#ffff00" emissiveIntensity={highlight} />
      </mesh>

      {/* 色环 1 - 棕 */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-2.5, 0, 0]}>
        <cylinderGeometry args={[1.25, 1.25, 0.9, 16]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* 色环 2 - 黑 */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-1, 0, 0]}>
        <cylinderGeometry args={[1.25, 1.25, 0.9, 16]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* 色环 3 - 橙 */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.5, 0, 0]}>
        <cylinderGeometry args={[1.25, 1.25, 0.9, 16]} />
        <meshStandardMaterial color="#ff8c00" />
      </mesh>

      {/* 色环 4 - 金（误差） */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[2.5, 0, 0]}>
        <cylinderGeometry args={[1.25, 1.25, 0.9, 16]} />
        <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 左引脚 */}
      <mesh position={[-7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 5, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* 右引脚 */}
      <mesh position={[7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 5, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>

      {showLabel && (
        <Text position={[0, 4, 0]} fontSize={2.2} color="#ffffff" anchorX="center" anchorY="middle">
          {info.name} {info.value}
        </Text>
      )}
    </group>
  );
}

// ─── 电容组件 ─────────────────────────────────────────────────────────────────

/**
 * 电解电容 (Electrolytic Capacitor)
 * 结构：铝制圆柱体 + 顶部十字刻痕 + 负极白色条纹 + 两根引脚
 */
function Capacitor({ info, isSelected, isHovered, onSelect, onHover, showLabel }: ComponentProps) {
  const highlight = isSelected ? 0.6 : isHovered ? 0.25 : 0;
  const [x, , z] = info.position;

  return (
    <group
      position={[x, 2, z]}
      onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : info.id); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(info.id); }}
      onPointerOut={() => onHover(null)}
    >
      {/* 电容主体 */}
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[3, 3, 10, 32]} />
        <meshStandardMaterial color="#3a3a7a" roughness={0.4} metalness={0.5} emissive="#ffff00" emissiveIntensity={highlight} />
      </mesh>

      {/* 负极标记（白色条纹） */}
      <mesh position={[0, 9.6, 0]}>
        <cylinderGeometry args={[3.02, 3.02, 0.8, 32]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.9} />
      </mesh>

      {/* 顶部（铝盖） */}
      <mesh position={[0, 10.1, 0]}>
        <cylinderGeometry args={[3, 3, 0.2, 32]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 正极引脚（较长） */}
      <mesh position={[-1.2, -0.8, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 1.6, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* 负极引脚（较短） */}
      <mesh position={[1.2, -0.6, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 1.2, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>

      {showLabel && (
        <Text position={[0, 13, 0]} fontSize={2.2} color="#ffffff" anchorX="center" anchorY="middle">
          {info.name} {info.value}
        </Text>
      )}
    </group>
  );
}

// ─── IC 芯片组件 ──────────────────────────────────────────────────────────────

/**
 * DIP 封装 IC 芯片 (Dual In-line Package)
 * 结构：黑色环氧树脂主体 + 左右各 8 根引脚 + 缺口方向标记
 */
function ICChip({ info, isSelected, isHovered, onSelect, onHover, showLabel }: ComponentProps) {
  const highlight = isSelected ? 0.6 : isHovered ? 0.25 : 0;
  const [x, , z] = info.position;

  const pinCount = 8;
  const bodyW = 10;   // X 方向宽度
  const bodyD = 22;   // Z 方向深度
  const pinSpacing = (bodyD - 4) / (pinCount - 1);
  const startZ = -(bodyD - 4) / 2;

  return (
    <group
      position={[x, 2, z]}
      onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : info.id); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(info.id); }}
      onPointerOut={() => onHover(null)}
    >
      {/* IC 主体 */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[bodyW, 4, bodyD]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.85} emissive="#ffff00" emissiveIntensity={highlight} />
      </mesh>

      {/* 缺口标记（半圆凹槽，表示 Pin 1 方向） */}
      <mesh position={[0, 4.1, -bodyD / 2 + 2]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.3, 16, 1, false, Math.PI, Math.PI]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* 左侧引脚（负 X 方向） */}
      {Array.from({ length: pinCount }).map((_, i) => (
        <mesh key={`lp-${i}`} position={[-bodyW / 2 - 2, 0.8, startZ + i * pinSpacing]}>
          <boxGeometry args={[4, 0.8, 0.7]} />
          <meshStandardMaterial color="#b8b8b8" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* 右侧引脚（正 X 方向） */}
      {Array.from({ length: pinCount }).map((_, i) => (
        <mesh key={`rp-${i}`} position={[bodyW / 2 + 2, 0.8, startZ + i * pinSpacing]}>
          <boxGeometry args={[4, 0.8, 0.7]} />
          <meshStandardMaterial color="#b8b8b8" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* IC 型号丝印 */}
      <Text position={[0, 4.2, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.8} color="#cccccc" anchorX="center" anchorY="middle">
        {info.value}
      </Text>

      {showLabel && (
        <Text position={[0, 8, 0]} fontSize={2.2} color="#ffffff" anchorX="center" anchorY="middle">
          {info.name}
        </Text>
      )}
    </group>
  );
}

// ─── LED 组件 ─────────────────────────────────────────────────────────────────

/**
 * 直插 LED (Through-hole LED)
 * 结构：圆柱底座 + 半球形透明灯罩 + 两根引脚（正极长、负极短）
 * 自发光效果模拟 LED 点亮状态
 */
function LED({ info, isSelected, isHovered, onSelect, onHover, showLabel }: ComponentProps) {
  const isRed = info.value.includes("红");
  const ledColor = isRed ? "#ff2020" : "#20ff40";
  const glowBase = isRed ? "#ff0000" : "#00ff00";
  const glowIntensity = isSelected ? 1.2 : isHovered ? 0.8 : 0.4;
  const [x, , z] = info.position;

  return (
    <group
      position={[x, 2, z]}
      onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : info.id); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(info.id); }}
      onPointerOut={() => onHover(null)}
    >
      {/* LED 底座圆柱 */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[2, 2, 3, 24]} />
        <meshStandardMaterial color={ledColor} roughness={0.3} emissive={glowBase} emissiveIntensity={glowIntensity} />
      </mesh>

      {/* LED 半球灯罩（透明） */}
      <mesh position={[0, 3.5, 0]}>
        <sphereGeometry args={[2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={ledColor}
          roughness={0.05}
          metalness={0}
          transparent
          opacity={0.75}
          emissive={glowBase}
          emissiveIntensity={glowIntensity}
        />
      </mesh>

      {/* 正极引脚（长） */}
      <mesh position={[-0.9, -1, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 2, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* 负极引脚（短） */}
      <mesh position={[0.9, -0.7, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 1.4, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>

      {showLabel && (
        <Text position={[0, 7, 0]} fontSize={2.2} color="#ffffff" anchorX="center" anchorY="middle">
          {info.name}
        </Text>
      )}
    </group>
  );
}

// ─── 连接器组件 ───────────────────────────────────────────────────────────────

/**
 * 排针连接器 (Pin Header Connector)
 * 结构：白色尼龙底座 + 6 根金属引脚（2×3 排列）
 */
function Connector({ info, isSelected, isHovered, onSelect, onHover, showLabel }: ComponentProps) {
  const highlight = isSelected ? 0.6 : isHovered ? 0.25 : 0;
  const [x, , z] = info.position;

  const pinPositions: [number, number, number][] = [
    [-2.54, 0, -2.54], [-2.54, 0, 0], [-2.54, 0, 2.54],
    [2.54, 0, -2.54],  [2.54, 0, 0],  [2.54, 0, 2.54],
  ];

  return (
    <group
      position={[x, 2, z]}
      onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : info.id); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(info.id); }}
      onPointerOut={() => onHover(null)}
    >
      {/* 连接器底座 */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[10, 5, 10]} />
        <meshStandardMaterial color="#f0ead6" roughness={0.95} emissive="#ffff00" emissiveIntensity={highlight} />
      </mesh>

      {/* 金属引脚 */}
      {pinPositions.map((pos, i) => (
        <mesh key={i} position={[pos[0], 4, pos[2]]}>
          <cylinderGeometry args={[0.4, 0.4, 6, 8]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.15} />
        </mesh>
      ))}

      {showLabel && (
        <Text position={[0, 9, 0]} fontSize={2.2} color="#ffffff" anchorX="center" anchorY="middle">
          {info.name}
        </Text>
      )}
    </group>
  );
}

// ─── PCB 板 ───────────────────────────────────────────────────────────────────

function PCBBoard() {
  return (
    <mesh position={[0, 1, 0]} castShadow receiveShadow>
      <boxGeometry args={[100, 2, 60]} />
      <meshStandardMaterial color="#1a5f1a" roughness={0.8} metalness={0.1} />
    </mesh>
  );
}

// ─── 场景 ─────────────────────────────────────────────────────────────────────

function Scene({
  lightIntensity,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  showLabel,
  visibility,
}: {
  lightIntensity: number;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  showLabel: boolean;
  visibility: Record<ComponentType, boolean>;
}) {
  const componentMap: Record<ComponentType, React.ComponentType<ComponentProps>> = {
    resistor: Resistor,
    capacitor: Capacitor,
    ic: ICChip,
    led: LED,
    connector: Connector,
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[60, 100, 60]}
        intensity={lightIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <pointLight position={[-50, 60, -40]} intensity={0.4} />

      {/* 点击空白处取消选中 */}
      <mesh
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={() => onSelect(null)}
      >
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>

      <PCBBoard />

      {COMPONENTS.map((comp) => {
        if (!visibility[comp.type]) return null;
        const Comp = componentMap[comp.type];
        return (
          <Comp
            key={comp.id}
            info={comp}
            isSelected={selectedId === comp.id}
            isHovered={hoveredId === comp.id}
            onSelect={onSelect}
            onHover={onHover}
            showLabel={showLabel}
          />
        );
      })}

      <OrbitControls enableDamping dampingFactor={0.05} minDistance={40} maxDistance={300} />
    </>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function PCBComponents() {
  const [lightIntensity, setLightIntensity] = useState(1.2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showLabel, setShowLabel] = useState(true);
  const [visibility, setVisibility] = useState<Record<ComponentType, boolean>>({
    resistor: true,
    capacitor: true,
    ic: true,
    led: true,
    connector: true,
  });
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedInfo = COMPONENTS.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!canvasRef.current) return;

    const gui = new GUI({ title: "元器件控制面板", container: canvasRef.current });
    gui.domElement.style.cssText = "position:absolute;top:10px;right:10px;left:auto;";

    const params = {
      lightIntensity,
      showLabel,
      showResistors: true,
      showCapacitors: true,
      showIC: true,
      showLED: true,
      showConnector: true,
    };

    gui.add(params, "lightIntensity", 0, 3, 0.1).name("光照强度").onChange((v: number) => setLightIntensity(v));
    gui.add(params, "showLabel").name("显示标签").onChange((v: boolean) => setShowLabel(v));

    const vis = gui.addFolder("元器件显示");
    vis.add(params, "showResistors").name("电阻 (R)").onChange((v: boolean) => setVisibility((p) => ({ ...p, resistor: v })));
    vis.add(params, "showCapacitors").name("电容 (C)").onChange((v: boolean) => setVisibility((p) => ({ ...p, capacitor: v })));
    vis.add(params, "showIC").name("IC 芯片 (U)").onChange((v: boolean) => setVisibility((p) => ({ ...p, ic: v })));
    vis.add(params, "showLED").name("LED").onChange((v: boolean) => setVisibility((p) => ({ ...p, led: v })));
    vis.add(params, "showConnector").name("连接器 (J)").onChange((v: boolean) => setVisibility((p) => ({ ...p, connector: v })));
    vis.open();

    return () => gui.destroy();
  }, []);

  return (
    <div className="flex h-screen w-full flex-col gap-4 p-4 lg:flex-row">
      {/* 左侧：3D 渲染区域 */}
      <div ref={canvasRef} className="relative flex-1 rounded-lg border bg-card shadow-sm">
        <Canvas camera={{ position: [80, 70, 100], fov: 50 }} shadows>
          <Suspense fallback={null}>
            <Scene
              lightIntensity={lightIntensity}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={setSelectedId}
              onHover={setHoveredId}
              showLabel={showLabel}
              visibility={visibility}
            />
          </Suspense>
        </Canvas>

        {/* 悬停提示 */}
        {hoveredId && !selectedId && (
          <div className="pointer-events-none absolute bottom-4 left-4 rounded bg-black/70 px-3 py-1.5 text-sm text-white">
            {COMPONENTS.find((c) => c.id === hoveredId)?.name} — 点击查看详情
          </div>
        )}
      </div>

      {/* 右侧：说明文档 */}
      <div className="w-full space-y-4 overflow-y-auto lg:w-96">
        <Card>
          <CardHeader>
            <CardTitle>Demo 3: PCB 元器件渲染</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            点击 3D 场景中的元器件查看详情。学习如何用基础几何体组合出真实的 PCB 元器件，并实现鼠标交互高亮。
          </CardContent>
        </Card>

        {/* 选中元器件信息 */}
        {selectedInfo ? (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded px-2 py-0.5 text-xs font-mono">
                  {selectedInfo.type.toUpperCase()}
                </span>
                {selectedInfo.name} — {selectedInfo.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{selectedInfo.description}</p>
              <p className="text-muted-foreground font-mono text-xs">
                位置: X={selectedInfo.position[0]}, Z={selectedInfo.position[2]}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="text-muted-foreground py-6 text-center text-sm">
              点击场景中的元器件查看详情
            </CardContent>
          </Card>
        )}

        {/* 核心概念 */}
        <Card>
          <CardHeader><CardTitle>核心概念</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <h3 className="font-semibold">1. group（组合节点）</h3>
              <p className="text-muted-foreground">将多个 mesh 包裹在 group 中，统一管理位置、旋转、缩放，并共享事件处理。</p>
              <pre className="bg-muted mt-1 rounded p-2 text-xs">{`<group position={[x, y, z]} onClick={...}>
  <mesh>...</mesh>  {/* 主体 */}
  <mesh>...</mesh>  {/* 引脚 */}
</group>`}</pre>
            </div>

            <div className="space-y-1">
              <h3 className="font-semibold">2. Raycasting 交互</h3>
              <p className="text-muted-foreground">R3F 自动处理射线检测，直接在 mesh/group 上绑定事件即可。</p>
              <pre className="bg-muted mt-1 rounded p-2 text-xs">{`<group
  onClick={(e) => {
    e.stopPropagation(); // 阻止冒泡
    onSelect(id);
  }}
  onPointerOver={(e) => {
    e.stopPropagation();
    onHover(id);
  }}
  onPointerOut={() => onHover(null)}
>`}</pre>
            </div>

            <div className="space-y-1">
              <h3 className="font-semibold">3. emissive 自发光高亮</h3>
              <p className="text-muted-foreground">通过 emissive 和 emissiveIntensity 实现选中/悬停高亮，无需额外光源。</p>
              <pre className="bg-muted mt-1 rounded p-2 text-xs">{`<meshStandardMaterial
  color="#1a1a1a"
  emissive="#ffff00"
  emissiveIntensity={isSelected ? 0.6 : 0}
/>`}</pre>
            </div>

            <div className="space-y-1">
              <h3 className="font-semibold">4. 几何体组合</h3>
              <p className="text-muted-foreground">PCB 元器件由基础几何体拼装而成：</p>
              <ul className="text-muted-foreground ml-3 list-disc space-y-0.5 text-xs">
                <li>电阻：CylinderGeometry × 6（体 + 色环 + 引脚）</li>
                <li>电容：CylinderGeometry × 4（体 + 条纹 + 引脚）</li>
                <li>IC：BoxGeometry × 17（体 + 16 引脚）</li>
                <li>LED：CylinderGeometry + SphereGeometry + 引脚</li>
                <li>连接器：BoxGeometry + CylinderGeometry × 6</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>工业应用场景</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-sm">
            <p>在 PCB 故障检测软件中，这套技术可用于：</p>
            <ul className="ml-3 list-disc space-y-1">
              <li>点击元器件查看测试数据和故障信息</li>
              <li>用颜色区分正常/警告/故障状态</li>
              <li>高亮显示故障元器件及其关联走线</li>
              <li>悬停显示实时电压/电流测量值</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>练习建议</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-sm">
            <p>✅ 修改 COMPONENTS 数组，添加新的元器件</p>
            <p>✅ 给选中的元器件添加 useFrame 脉冲动画</p>
            <p>✅ 用不同颜色表示元器件的健康状态</p>
            <p>✅ 添加 PointLight 跟随选中元器件移动</p>
            <p>✅ 实现多选功能（Ctrl + 点击）</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
