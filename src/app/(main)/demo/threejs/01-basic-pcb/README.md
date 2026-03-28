# Three.js Demos 学习笔记

这个目录包含了 Three.js 和 React Three Fiber 的学习示例。

## React Three Fiber 核心概念

### 1. 声明式 JSX - 无需导入基础对象

在 React Three Fiber 中，基础的 Three.js 对象**不需要显式导入**。React Three Fiber 会自动将 JSX 元素转换为对应的 Three.js 对象。

#### 自动转换示例

```tsx
// ✅ React Three Fiber 写法（无需导入）
<Canvas>
  <ambientLight intensity={0.4} />
  <directionalLight position={[50, 100, 50]} intensity={1} />
  <pointLight position={[-50, 50, -50]} intensity={0.3} />
</Canvas>
```

```javascript
// ❌ 传统 Three.js 写法（需要导入和手动创建）
import * as THREE from 'three';

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 100, 50);
const pointLight = new THREE.PointLight(0xffffff, 0.3);
pointLight.position.set(-50, 50, -50);

scene.add(ambientLight);
scene.add(directionalLight);
scene.add(pointLight);
```

#### 转换规则

| JSX 元素 | Three.js 对象 | 说明 |
|---------|--------------|------|
| `<ambientLight />` | `THREE.AmbientLight` | 环境光 |
| `<directionalLight />` | `THREE.DirectionalLight` | 平行光 |
| `<pointLight />` | `THREE.PointLight` | 点光源 |
| `<spotLight />` | `THREE.SpotLight` | 聚光灯 |
| `<mesh />` | `THREE.Mesh` | 网格对象 |
| `<boxGeometry />` | `THREE.BoxGeometry` | 盒子几何体 |
| `<sphereGeometry />` | `THREE.SphereGeometry` | 球体几何体 |
| `<meshStandardMaterial />` | `THREE.MeshStandardMaterial` | 标准材质 |

**命名规则：** JSX 使用小驼峰命名（camelCase），Three.js 使用大驼峰命名（PascalCase）

### 2. 需要导入的情况

从 `@react-three/drei` 等辅助库提供的**高级组件**需要显式导入：

```tsx
import { OrbitControls, Grid, Text, PerspectiveCamera } from '@react-three/drei';

<Canvas>
  <OrbitControls />  {/* 轨道控制器 */}
  <Grid />           {/* 网格辅助线 */}
  <Text />           {/* 3D 文本 */}
</Canvas>
```

### 3. 属性映射

React Three Fiber 会自动将 JSX 属性映射到 Three.js 对象的属性：

```tsx
<!-- JSX 属性 -->
<directionalLight
  position={[50, 100, 50]}
  intensity={1}
  castShadow
/>

<!-- 等价于 Three.js -->
const light = new THREE.DirectionalLight();
light.position.set(50, 100, 50);
light.intensity = 1;
light.castShadow = true;
```

## 坐标系统

Three.js 使用**右手坐标系**：

- 🔴 **X 轴（红色）**：左右方向，正值向右
- 🟢 **Y 轴（绿色）**：上下方向，正值向上
- 🔵 **Z 轴（蓝色）**：前后方向，正值向前

### 相机位置示例

```tsx
<Canvas
  camera={{
    position: [100, 80, 120], // [X, Y, Z]
    fov: 45,
  }}
>
```

**位置解释：**
- `X=100`：相机在场景右侧 100 单位
- `Y=80`：相机在场景上方 80 单位
- `Z=120`：相机在场景后方 120 单位

## 光照系统

### AmbientLight（环境光）

```tsx
<ambientLight intensity={0.4} />
```

- **特点**：均匀照亮场景中的所有对象，无方向性
- **用途**：提供基础亮度，避免完全黑暗的区域
- **参数**：
  - `intensity`：光照强度（0-1）

### DirectionalLight（平行光）

```tsx
<directionalLight
  position={[50, 100, 50]}
  intensity={1}
  castShadow
  shadow-mapSize={[2048, 2048]}
/>
```

- **特点**：模拟太阳光，光线平行，可产生阴影
- **用途**：主要光源，创建明暗对比
- **参数**：
  - `position`：光源位置
  - `intensity`：光照强度
  - `castShadow`：是否投射阴影
  - `shadow-mapSize`：阴影贴图分辨率

### PointLight（点光源）

```tsx
<pointLight position={[-50, 50, -50]} intensity={0.3} />
```

- **特点**：从一个点向所有方向发射光线
- **用途**：模拟灯泡、蜡烛等光源
- **参数**：
  - `position`：光源位置
  - `intensity`：光照强度

## 示例文件

- `BasicPCB.tsx` - 基础 PCB 板渲染，学习场景、相机、光照的基本使用

## 学习资源

- [React Three Fiber 官方文档](https://docs.pmnd.rs/react-three-fiber)
- [Three.js 官方文档](https://threejs.org/docs/)
- [@react-three/drei 组件库](https://github.com/pmndrs/drei)
