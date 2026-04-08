"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { Suspense, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import * as THREE from "three";
import GUI from "lil-gui";

/**
 * Demo 2: PCB 电路走线渲染
 *
 * 学习要点：
 * 1. TubeGeometry - 管道几何体，用于创建 3D 走线
 * 2. CatmullRomCurve3 - 平滑曲线，定义走线路径
 * 3. 实例化渲染 - 高效渲染多个相似对象
 * 4. 焊盘（Pad）渲染 - 使用圆柱体创建焊盘
 * 5. 分层渲染 - 模拟 PCB 多层板结构
 */

/**
 * PCB 板组件 - 渲染基础 PCB 板
 */
function PCBBoard() {
  const width = 100;
  const height = 2;
  const depth = 60;

  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color="#1a5f1a" roughness={0.8} metalness={0.1} />
    </mesh>
  );
}

/**
 * 焊盘组件 - 渲染圆形焊盘
 *
 * @param {Object} props - 组件属性
 * @param {[number, number, number]} props.position - 焊盘位置 [x, y, z]
 * @param {number} props.radius - 焊盘半径
 * @param {string} props.color - 焊盘颜色
 */
function Pad({
  position,
  radius = 2,
  color = "#d4af37",
}: {
  position: [number, number, number];
  radius?: number;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} castShadow>
      {/* 圆柱体作为焊盘，高度很小 */}
      <cylinderGeometry args={[radius, radius, 0.3, 32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.9} // 焊盘是金属，高金属度
      />
    </mesh>
  );
}

/**
 * 电路走线组件 - 使用 TubeGeometry 渲染 3D 走线
 *
 * @param {Object} props - 组件属性
 * @param {Array<[number, number, number]>} props.points - 走线路径点
 * @param {number} props.width - 走线宽度
 * @param {string} props.color - 走线颜色
 */
function Trace({
  points,
  width = 0.5,
  color = "#c87533",
}: {
  points: Array<[number, number, number]>;
  width?: number;
  color?: string;
}) {
  // 将点数组转换为 Vector3 数组
  const vectors = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));

  // 创建平滑曲线路径
  const curve = new THREE.CatmullRomCurve3(vectors);

  // 使用 TubeGeometry 沿着曲线创建管道
  const tubeGeometry = new THREE.TubeGeometry(
    curve,
    64, // 路径分段数，越大越平滑
    width, // 管道半径（走线宽度）
    8, // 管道横截面分段数
    false // 是否闭合
  );

  return (
    <mesh geometry={tubeGeometry} castShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.4}
        metalness={0.8} // 铜走线，高金属度
      />
    </mesh>
  );
}

/**
 * 简单电路示例 - 渲染一个简单的电路布局
 */
function SimpleCircuit({ showTraces }: { showTraces: boolean }) {
  // 定义焊盘位置
  const pads: Array<{ pos: [number, number, number]; label: string }> = [
    { pos: [-30, 2.3, -20], label: "VCC" },
    { pos: [-30, 2.3, 0], label: "GND" },
    { pos: [-30, 2.3, 20], label: "SIG" },
    { pos: [30, 2.3, -20], label: "OUT1" },
    { pos: [30, 2.3, 0], label: "OUT2" },
    { pos: [30, 2.3, 20], label: "OUT3" },
  ];

  // 定义走线路径
  const traces = [
    // VCC 走线：从左上到右上
    {
      points: [
        [-30, 2.3, -20],
        [-10, 2.3, -20],
        [10, 2.3, -20],
        [30, 2.3, -20],
      ] as Array<[number, number, number]>,
      color: "#ff6b6b", // 红色表示电源线
    },
    // GND 走线：从左中到右中
    {
      points: [
        [-30, 2.3, 0],
        [-10, 2.3, 0],
        [10, 2.3, 0],
        [30, 2.3, 0],
      ] as Array<[number, number, number]>,
      color: "#4ecdc4", // 青色表示地线
    },
    // 信号走线：从左下到右下，带弯曲
    {
      points: [
        [-30, 2.3, 20],
        [-15, 2.3, 20],
        [0, 2.3, 10],
        [15, 2.3, 20],
        [30, 2.3, 20],
      ] as Array<[number, number, number]>,
      color: "#ffe66d", // 黄色表示信号线
    },
  ];

  return (
    <group>
      {/* 渲染焊盘 */}
      {pads.map((pad, index) => (
        <group key={index}>
          <Pad position={pad.pos} radius={2.5} />
          {/* 焊盘标签 */}
          <Text
            position={[pad.pos[0], pad.pos[1] + 3, pad.pos[2]]}
            fontSize={2}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {pad.label}
          </Text>
        </group>
      ))}

      {/* 渲染走线 */}
      {showTraces &&
        traces.map((trace, index) => (
          <Trace
            key={index}
            points={trace.points}
            width={0.6}
            color={trace.color}
          />
        ))}
    </group>
  );
}

/**
 * 复杂电路示例 - 渲染更复杂的电路布局
 */
function ComplexCircuit({ showTraces }: { showTraces: boolean }) {
  // 创建网格状焊盘布局
  const pads: Array<[number, number, number]> = [];
  for (let x = -40; x <= 40; x += 20) {
    for (let z = -25; z <= 25; z += 25) {
      pads.push([x, 2.3, z]);
    }
  }

  // 创建复杂走线路径
  const traces = [
    // 水平走线
    {
      points: [
        [-40, 2.3, -25],
        [-20, 2.3, -25],
        [0, 2.3, -25],
        [20, 2.3, -25],
        [40, 2.3, -25],
      ] as Array<[number, number, number]>,
      color: "#ff6b6b",
    },
    // 垂直走线
    {
      points: [
        [-40, 2.3, -25],
        [-40, 2.3, 0],
        [-40, 2.3, 25],
      ] as Array<[number, number, number]>,
      color: "#4ecdc4",
    },
    // 对角走线
    {
      points: [
        [-20, 2.3, -25],
        [0, 2.3, 0],
        [20, 2.3, 25],
      ] as Array<[number, number, number]>,
      color: "#ffe66d",
    },
    // S 形走线
    {
      points: [
        [40, 2.3, -25],
        [30, 2.3, -10],
        [40, 2.3, 10],
        [30, 2.3, 25],
      ] as Array<[number, number, number]>,
      color: "#95e1d3",
    },
  ];

  return (
    <group>
      {/* 渲染焊盘 */}
      {pads.map((pad, index) => (
        <Pad key={index} position={pad} radius={1.5} />
      ))}

      {/* 渲染走线 */}
      {showTraces &&
        traces.map((trace, index) => (
          <Trace
            key={index}
            points={trace.points}
            width={0.4}
            color={trace.color}
          />
        ))}
    </group>
  );
}

/**
 * 地面组件
 */
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#f0f0f0" />
    </mesh>
  );
}

/**
 * 坐标轴组件
 */
function Axes({ size = 50 }: { size?: number }) {
  return (
    <group>
      {/* X 轴 - 红色 */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, size, 0, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ff0000" linewidth={2} />
      </line>
      <Text position={[size + 5, 0, 0]} fontSize={3} color="#ff0000">
        X
      </Text>

      {/* Y 轴 - 绿色 */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, size, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ff00" linewidth={2} />
      </line>
      <Text position={[0, size + 5, 0]} fontSize={3} color="#00ff00">
        Y
      </Text>

      {/* Z 轴 - 蓝色 */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, 0, size]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#0000ff" linewidth={2} />
      </line>
      <Text position={[0, 0, size + 5]} fontSize={3} color="#0000ff">
        Z
      </Text>
    </group>
  );
}

/**
 * 场景组件 - 包含所有 3D 对象
 */
function Scene({
  lightIntensity,
  showAxes,
  showTraces,
  circuitType,
}: {
  lightIntensity: number;
  showAxes: boolean;
  showTraces: boolean;
  circuitType: "simple" | "complex";
}) {
  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.4} />

      {/* 平行光 */}
      <directionalLight
        position={[50, 50, 50]}
        intensity={lightIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />

      {/* PCB 板 */}
      <PCBBoard />

      {/* 电路 */}
      {circuitType === "simple" ? (
        <SimpleCircuit showTraces={showTraces} />
      ) : (
        <ComplexCircuit showTraces={showTraces} />
      )}

      {/* 地面 */}
      <Floor />

      {/* 坐标轴 */}
      {showAxes && <Axes size={60} />}

      {/* 轨道控制器 */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={50}
        maxDistance={300}
      />
    </>
  );
}

/**
 * 主组件 - PCB 电路走线渲染演示
 */
export default function CircuitTraces() {
  const [lightIntensity, setLightIntensity] = useState(1.0);
  const [showAxes, setShowAxes] = useState(true);
  const [showTraces, setShowTraces] = useState(true);
  const [circuitType, setCircuitType] = useState<"simple" | "complex">(
    "simple"
  );
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // 初始化 lil-gui
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // 创建 GUI，指定容器
    const gui = new GUI({
      title: "PCB 控制面板",
      container: canvasContainerRef.current
    });

    // 设置 GUI 位置到右上角
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '10px';
    gui.domElement.style.right = '10px';
    gui.domElement.style.left = 'auto';

    // 创建控制参数对象
    const params = {
      lightIntensity: lightIntensity,
      showAxes: showAxes,
      showTraces: showTraces,
      circuitType: circuitType,
    };

    // 创建文件夹分组
    const lightFolder = gui.addFolder("光照设置");
    lightFolder
      .add(params, "lightIntensity", 0, 2, 0.1)
      .name("光照强度")
      .onChange((value: number) => setLightIntensity(value));

    const displayFolder = gui.addFolder("显示设置");
    displayFolder
      .add(params, "showAxes")
      .name("显示坐标轴")
      .onChange((value: boolean) => setShowAxes(value));

    displayFolder
      .add(params, "showTraces")
      .name("显示走线")
      .onChange((value: boolean) => setShowTraces(value));

    const circuitFolder = gui.addFolder("电路设置");
    circuitFolder
      .add(params, "circuitType", ["simple", "complex"])
      .name("电路类型")
      .onChange((value: "simple" | "complex") => setCircuitType(value));

    // 默认展开所有文件夹
    lightFolder.open();
    displayFolder.open();
    circuitFolder.open();

    // 清理函数
    return () => {
      gui.destroy();
    };
  }, []);

  return (
    <div className="flex h-screen w-full flex-col gap-4 p-4 lg:flex-row">
      {/* 左侧：3D 渲染区域 */}
      <div ref={canvasContainerRef} className="flex-1 rounded-lg border bg-card shadow-sm relative">
        <Canvas
          camera={{ position: [100, 80, 120], fov: 50 }}
          shadows
          className="h-full w-full"
        >
          <Suspense fallback={null}>
            <Scene
              lightIntensity={lightIntensity}
              showAxes={showAxes}
              showTraces={showTraces}
              circuitType={circuitType}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* 右侧：说明文档 */}
      <div className="w-full space-y-4 overflow-y-auto lg:w-96">
        {/* 标题 */}
        <Card>
          <CardHeader>
            <CardTitle>Demo 2: PCB 电路走线渲染</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            学习如何使用 TubeGeometry 和 CatmullRomCurve3
            渲染平滑的电路走线，以及如何创建焊盘和复杂电路布局。
          </CardContent>
        </Card>

        {/* 核心概念 */}
        <Card>
          <CardHeader>
            <CardTitle>核心概念</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold">1. TubeGeometry（管道几何体）</h3>
              <p className="text-muted-foreground">
                TubeGeometry 沿着一条曲线路径创建管状几何体，非常适合渲染
                PCB 走线：
              </p>
              <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                {`const tubeGeometry = new THREE.TubeGeometry(
  curve,    // 路径曲线
  64,       // 分段数
  0.5,      // 管道半径
  8,        // 横截面分段
  false     // 是否闭合
);`}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">2. CatmullRomCurve3（平滑曲线）</h3>
              <p className="text-muted-foreground">
                通过一组点创建平滑的 3D 曲线，走线会自然地通过所有点：
              </p>
              <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                {`const points = [
  new THREE.Vector3(-30, 2, -20),
  new THREE.Vector3(0, 2, 0),
  new THREE.Vector3(30, 2, 20)
];
const curve = new THREE.CatmullRomCurve3(points);`}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">3. 焊盘渲染</h3>
              <p className="text-muted-foreground">
                使用 CylinderGeometry 创建圆形焊盘，设置高金属度材质：
              </p>
              <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                {`<cylinderGeometry args={[radius, radius, 0.3, 32]} />
<meshStandardMaterial
  color="#d4af37"  // 金色
  metalness={0.9}  // 高金属度
  roughness={0.3}  // 低粗糙度
/>`}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">4. 走线颜色规范</h3>
              <p className="text-muted-foreground">
                在 PCB 设计中，不同类型的走线通常使用不同颜色标识：
                <br />• <span className="text-red-500">红色</span>：电源线（VCC）
                <br />• <span className="text-cyan-500">青色</span>：地线（GND）
                <br />• <span className="text-yellow-500">黄色</span>
                ：信号线（SIG）
                <br />• <span className="text-orange-500">橙色</span>
                ：铜走线（默认）
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 实际应用 */}
        <Card>
          <CardHeader>
            <CardTitle>实际应用场景</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold">PCB 故障检测可视化</h3>
              <p className="text-muted-foreground">
                在工业故障检测软件中，可以使用这种渲染技术：
              </p>
              <ul className="text-muted-foreground ml-4 list-disc space-y-1">
                <li>高亮显示故障走线（改变颜色或添加发光效果）</li>
                <li>显示电流流向动画（沿走线移动的粒子）</li>
                <li>标注测试点和焊盘位置</li>
                <li>3D 可视化多层板结构</li>
                <li>交互式选择和测量走线</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 练习建议 */}
        <Card>
          <CardHeader>
            <CardTitle>练习建议</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>✅ 修改走线路径点，创建不同形状的走线</p>
            <p>✅ 调整走线宽度（width 参数），模拟不同线宽</p>
            <p>✅ 添加更多焊盘，创建自己的电路布局</p>
            <p>✅ 尝试使用不同颜色区分电源、地线和信号线</p>
            <p>✅ 添加 onClick 事件，实现走线的交互选择</p>
            <p>✅ 尝试添加发光效果（emissive 属性）模拟通电状态</p>
          </CardContent>
        </Card>

        {/* 下一步 */}
        <Card>
          <CardHeader>
            <CardTitle>下一步学习</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>
              在下一个 Demo 中，我们将学习：
              <br />• 添加动画效果（电流流动）
              <br />• 实现交互选择和高亮
              <br />• 多层板渲染
              <br />• 性能优化技巧
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
