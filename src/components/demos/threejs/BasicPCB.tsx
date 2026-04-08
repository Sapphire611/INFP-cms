"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Text } from "@react-three/drei";
import { Suspense, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GUI from "lil-gui";

/**
 * Demo 1: 基础 PCB 板渲染
 *
 * 学习要点：
 * 1. Canvas - React Three Fiber 的根组件，创建 WebGL 渲染上下文
 * 2. mesh - 3D 对象的基本单元，由几何体（geometry）和材质（material）组成
 * 3. boxGeometry - 盒子几何体，用于创建 PCB 板的基础形状
 * 4. meshStandardMaterial - 标准 PBR 材质，支持光照和阴影
 * 5. OrbitControls - 轨道控制器，允许用户旋转、缩放、平移视角
 */

/**
 * PCB 板组件 - 渲染一个绿色的 PCB 电路板
 *
 * @description
 * 创建一个标准 PCB 板的 3D 模型，使用盒子几何体和墨绿色材质
 * PCB 板尺寸：宽 100mm × 高 2mm × 深 60mm
 *
 * @returns {JSX.Element} PCB 板的 3D 网格对象
 */
function PCBBoard() {
  // PCB 板尺寸（单位：毫米）
  const width = 100; // 宽度
  const height = 2; // 厚度（PCB 板通常是 1.6mm，这里用 2mm 方便观察）
  const depth = 60; // 深度

  return (
    <mesh
      position={[0, height / 2, 0]} // PCB 板位置：X=0(中心), Y=1(半高), Z=0(中心)
      castShadow // 投射阴影：允许此物体投射阴影到其他物体上
      receiveShadow // 接收阴影：允许此物体接收其他物体的阴影
    >
      {/* 创建一个盒子几何体 */}
      <boxGeometry args={[width, height, depth]} />
      {/* 使用标准材质，绿色是典型的 PCB 板颜色 */}
      <meshStandardMaterial
        color="#1a5f1a" // 材质颜色：PCB 板墨绿色
        roughness={0.8} // 粗糙度：0.8（0=光滑如镜, 1=完全粗糙），PCB 板比较粗糙
        metalness={0.1} // 金属度：0.1（0=非金属, 1=纯金属），PCB 板几乎不反射
      />
    </mesh>
  );
}

/**
 * 地面组件 - 创建一个用于接收阴影的地面平面
 *
 * @description
 * 创建一个 200×200 单位的白色平面，水平放置在 Y=0 的位置
 * 主要作用是接收 PCB 板投射的阴影，增强立体感
 *
 * @returns {JSX.Element} 地面平面的 3D 网格对象
 */
function Floor() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]} // 旋转角度：X轴旋转-90度，将平面从垂直变为水平
      position={[0, 0, 0]} // 地面位置：X=0, Y=0, Z=0（原点）
      receiveShadow // 接收阴影：允许地面接受 PCB 板投射的阴影
    >
      <planeGeometry args={[200, 200]} />
      {/* 平面几何体：200×200 单位大小 */}
      <meshStandardMaterial color="#f0f0f0" />
      {/* 材质颜色：浅灰色 */}
    </mesh>
  );
}

/**
 * 带刻度标签的坐标轴组件 - 显示 XYZ 坐标轴及刻度数值
 *
 * @description
 * 创建一个可视化的坐标轴系统，包含：
 * - 三条彩色坐标轴（X-红、Y-绿、Z-蓝）
 * - 每 20 单位显示一次刻度数的标签
 * - 原点标记（0）
 * - 轴标识（X、Y、Z）
 *
 * 坐标轴长度：150 单位
 * 刻度间隔：20 单位
 * 标签字体大小：4 单位
 *
 * @returns {JSX.Element} 带刻度标签的坐标轴组件
 */
function AxisWithLabels() {
  const axisLength = 150;
  const labelInterval = 20; // 每 20 单位显示一个标签
  const labelSize = 4;

  // 生成刻度标签
  const labels = [];
  for (let i = labelInterval; i <= axisLength; i += labelInterval) {
    // X 轴标签（红色）
    labels.push(
      <group key={`x-${i}`}>
        <Text
          position={[i, -5, 0]} // 文本位置：X=当前刻度值, Y=-5(下方), Z=0
          fontSize={labelSize} // 字体大小：4 单位
          color="#ff0000" // 文本颜色：红色（对应 X 轴）
          anchorX="center" // X 轴锚点：居中对齐
          anchorY="middle" // Y 轴锚点：垂直居中
        >
          {i}
        </Text>
      </group>,
    );

    // Y 轴标签（绿色）
    labels.push(
      <group key={`y-${i}`}>
        <Text
          position={[-5, i, 0]} // 文本位置：X=-5(左侧), Y=当前刻度值, Z=0
          fontSize={labelSize} // 字体大小：4 单位
          color="#00ff00" // 文本颜色：绿色（对应 Y 轴）
          anchorX="center" // X 轴锚点：居中对齐
          anchorY="middle" // Y 轴锚点：垂直居中
        >
          {i}
        </Text>
      </group>,
    );

    // Z 轴标签（蓝色）
    labels.push(
      <group key={`z-${i}`}>
        <Text
          position={[0, -5, i]} // 文本位置：X=0, Y=-5(下方), Z=当前刻度值
          fontSize={labelSize} // 字体大小：4 单位
          color="#0000ff" // 文本颜色：蓝色（对应 Z 轴）
          anchorX="center" // X 轴锚点：居中对齐
          anchorY="middle" // Y 轴锚点：垂直居中
        >
          {i}
        </Text>
      </group>,
    );
  }

  return (
    <>
      {/* 原点标签 */}
      <Text
        position={[-8, -8, 0]} // 文本位置：X=-8(左下方), Y=-8(下方), Z=0
        fontSize={labelSize} // 字体大小：4 单位
        color="#666666" // 文本颜色：灰色
        anchorX="center" // X 轴锚点：居中对齐
        anchorY="middle" // Y 轴锚点：垂直居中
      >
        0
      </Text>

      {/* 轴标签 */}
      <Text
        position={[axisLength + 10, 0, 0]} // 文本位置：X=160(轴末端+10), Y=0, Z=0
        fontSize={6} // 字体大小：6 单位（比刻度数字大）
        color="#ff0000" // 文本颜色：红色
        anchorX="center" // X 轴锚点：居中对齐
        anchorY="middle" // Y 轴锚点：垂直居中
      >
        X
      </Text>
      <Text
        position={[0, axisLength + 10, 0]} // 文本位置：X=0, Y=160(轴末端+10), Z=0
        fontSize={6} // 字体大小：6 单位
        color="#00ff00" // 文本颜色：绿色
        anchorX="center" // X 轴锚点：居中对齐
        anchorY="middle" // Y 轴锚点：垂直居中
      >
        Y
      </Text>
      <Text
        position={[0, 0, axisLength + 10]} // 文本位置：X=0, Y=0, Z=160(轴末端+10)
        fontSize={6} // 字体大小：6 单位
        color="#0000ff" // 文本颜色：蓝色
        anchorX="center" // X 轴锚点：居中对齐
        anchorY="middle" // Y 轴锚点：垂直居中
      >
        Z
      </Text>

      {/* 刻度标签 */}
      {labels}

      {/* 坐标轴线条 */}
      <axesHelper args={[axisLength]} />
      {/* 坐标轴辅助线：显示红绿蓝三条轴线，长度 150 单位 */}
    </>
  );
}

/**
 * 场景组件 - 定义 3D 场景中的所有对象
 *
 * @param {number} lightIntensity - 平行光的光照强度
 *   - 取值范围：0 ~ 2
 *   - 默认值：1.0
 *   - 作用：控制主光源（DirectionalLight）的亮度，影响场景的整体明暗效果
 *   - 使用场景：用户通过滑块调整光照强度，观察不同光照条件下的 PCB 板效果
 *
 * @returns {JSX.Element} 包含所有 3D 对象的场景组件
 */
function Scene({ lightIntensity }: { lightIntensity: number }) {
  return (
    <>
      {/* 环境光 - 均匀照亮场景中的所有对象 */}
      <ambientLight intensity={0.4} />

      {/* 平行光 - 模拟太阳光，会产生阴影 */}
      <directionalLight
        position={[50, 100, 50]} // 光源位置：X=50(右侧), Y=100(上方), Z=50(后方)
        intensity={lightIntensity} // 光照强度（0-2），由父组件传入，可动态调整
        castShadow // 启用阴影投射
        shadow-mapSize={[2048, 2048]} // 阴影贴图分辨率：2048×2048 像素，数值越高阴影越清晰
        shadow-camera-far={200} // 阴影相机的远裁剪面距离：200 单位
        shadow-camera-left={-100} // 阴影相机的左边界：-100 单位
        shadow-camera-right={100} // 阴影相机的右边界：100 单位
        shadow-camera-top={100} // 阴影相机的上边界：100 单位
        shadow-camera-bottom={-100} // 阴影相机的下边界：-100 单位
      />

      {/* 点光源 - 从一个点向所有方向发射光线 */}
      <pointLight
        position={[-50, 50, -50]} // 光源位置：X=-50(左侧), Y=50(上方), Z=-50(前方)
        intensity={0.3} // 光照强度：0.3（较弱，作为补光）
      />

      <PCBBoard />
      <Floor />

      {/* 带刻度标签的坐标轴 */}
      <AxisWithLabels />

      {/* 网格辅助线 - 帮助理解空间位置 */}
      <Grid
        args={[200, 200]} // 网格尺寸：200×200 单位
        position={[0, 0.01, 0]} // 网格位置：Y=0.01 稍微高于地面，避免 Z-fighting
        cellSize={20} // 小格子大小：20 单位
        cellThickness={0.5} // 小格子线宽：0.5
        cellColor="#6f6f6f" // 小格子颜色：深灰色
        sectionSize={50} // 大区域大小：50 单位（每 5 个小格子一个大区域）
        sectionThickness={1} // 大区域线宽：1
        sectionColor="#9f9f9f" // 大区域颜色：浅灰色
        fadeDistance={300} // 淡出距离：300 单位外开始淡出
        fadeStrength={1} // 淡出强度：1（完全淡出）
        followCamera={false} // 是否跟随相机：false（固定位置）
      />

      {/* 轨道控制器 - 允许鼠标交互控制相机 */}
      <OrbitControls
        enablePan={true} // 允许平移
        enableZoom={true} // 允许缩放
        enableRotate={true} // 允许旋转
        minDistance={50} // 最小缩放距离
        maxDistance={300} // 最大缩放距离
        maxPolarAngle={Math.PI / 2} // 限制垂直旋转角度，防止相机进入地面以下
      />
    </>
  );
}

/**
 * BasicPCB 主组件 - Demo 1: 基础 PCB 板渲染
 *
 * @description
 * 这是 Demo 1 的主组件，展示如何使用 React Three Fiber 创建一个简单的 3D PCB 板场景。
 *
 * 功能特性：
 * - 渲染一个墨绿色的 PCB 板
 * - 显示带刻度标签的 XYZ 坐标轴
 * - 提供光照强度调节滑块
 * - 支持鼠标交互（旋转、缩放、平移）
 *
 * 学习要点：
 * - Canvas 组件的使用
 * - Mesh（网格）的组成（几何体 + 材质）
 * - 光照系统（环境光、平行光、点光源）
 * - Three.js 坐标系统
 *
 * @returns {JSX.Element} 完整的 Demo 1 页面组件
 */
export default function BasicPCB() {
  const [lightIntensity, setLightIntensity] = useState(1);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // 初始化 lil-gui
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // 创建 GUI，指定容器
    const gui = new GUI({
      title: "控制面板",
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
    };

    // 添加控制项
    gui
      .add(params, "lightIntensity", 0, 2, 0.1)
      .name("光照强度")
      .onChange((value: number) => setLightIntensity(value));

    // 清理函数
    return () => {
      gui.destroy();
    };
  }, []);

  return (
    <div className="@container/main flex flex-col gap-4 p-6">
      {/* 标题和说明 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Demo 1: 基础 PCB 板渲染</h1>
        <p className="text-muted-foreground">学习 Three.js 的核心概念：场景、相机、渲染器，创建一个简单的绿色 PCB 板</p>
        <p className="text-muted-foreground">🔴 X 轴标签为红色;🟢 Y 轴标签为绿色;🔵 Z 轴标签为蓝色</p>
      </div>

      {/* 3D 画布 */}
      <div ref={canvasContainerRef} className="h-[500px] w-full rounded-lg border bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 relative">
        {/* Canvas 是 React Three Fiber 的根组件 */}
        <Canvas
          shadows // 启用阴影渲染
          camera={{
            position: [100, 80, 120], // 相机初始位置：X=100(右侧), Y=80(上方), Z=120(后方)
            fov: 45, // 视野角度（Field of View）：45 度，模拟人眼视角
            near: 0.1, // 近裁剪面：距离相机 0.1 单位内的物体不渲染
            far: 1000, // 远裁剪面：距离相机 1000 单位外的物体不渲染
          }}
        >
          {/* Suspense 用于处理异步加载的资源 */}
          <Suspense fallback={null}>
            <Scene lightIntensity={lightIntensity} />
          </Suspense>
        </Canvas>
      </div>

      {/* 代码说明 */}
      <Card>
        <CardHeader>
          <CardTitle>核心概念解析</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">1. Canvas 组件</h3>
            <p className="text-muted-foreground text-sm">
              Canvas 是 React Three Fiber 的根组件，它自动创建 Scene（场景）、Camera（相机）和 Renderer（渲染器）。
              你只需要关注场景中的内容即可。
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">2. Mesh（网格）</h3>
            <p className="text-muted-foreground text-sm">
              Mesh 是 3D 对象的基本单元，由两部分组成：
              <br />• <strong>Geometry（几何体）</strong>：定义物体的形状（如盒子、球体、平面）
              <br />• <strong>Material（材质）</strong>：定义物体的外观（如颜色、纹理、光滑度）
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">3. 光照系统</h3>
            <p className="text-muted-foreground text-sm">
              Three.js 提供多种光源类型：
              <br />• <strong>AmbientLight（环境光）</strong>：均匀照亮所有对象，无方向性
              <br />• <strong>DirectionalLight（平行光）</strong>：模拟太阳光，有方向，可产生阴影
              <br />• <strong>PointLight（点光源）</strong>：从一个点向所有方向发射光线
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">4. 坐标系统</h3>
            <p className="text-muted-foreground text-sm">
              Three.js 使用右手坐标系：
              <br />• <strong>X 轴（红色）</strong>：左右方向，正值向右
              <br />• <strong>Y 轴（绿色）</strong>：上下方向，正值向上
              <br />• <strong>Z 轴（蓝色）</strong>：前后方向，正值向前
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              💡 <strong>理解相机位置 [100, 80, 120]</strong>：
              <br />
              • X=100：相机在场景右侧 100 单位
              <br />
              • Y=80：相机在场景上方 80 单位
              <br />• Z=120：相机在场景后方 120 单位
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 下一步 */}
      <Card>
        <CardHeader>
          <CardTitle>练习建议</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>✅ 尝试修改 PCB 板的颜色（#1a5f1a 改为其他颜色）</p>
          <p>✅ 调整 roughness 和 metalness 参数，观察材质变化</p>
          <p>✅ 修改相机位置参数，改变初始视角</p>
          <p>✅ 尝试添加另一个 boxGeometry，创建第二个 PCB 板</p>
          <p>✅ 调整光源位置和强度，观察阴影变化</p>
        </CardContent>
      </Card>
    </div>
  );
}
