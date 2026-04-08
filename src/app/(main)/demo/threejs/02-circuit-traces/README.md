# Demo 02: PCB 电路走线渲染

## 学习目标

本教程将教你如何在 PCB 板上渲染电路走线、焊盘等元素，这是 PCB 可视化的核心技术。

## 核心知识点

### 1. TubeGeometry（管道几何体）

用于创建沿着路径的 3D 管道，非常适合渲染电路走线。

```tsx
import * as THREE from "three";

// 定义路径点
const points = [
  new THREE.Vector3(-30, 2.3, -20),
  new THREE.Vector3(-10, 2.3, -20),
  new THREE.Vector3(10, 2.3, -20),
  new THREE.Vector3(30, 2.3, -20),
];

// 创建平滑曲线
const curve = new THREE.CatmullRomCurve3(points);

// 创建管道几何体
const tubeGeometry = new THREE.TubeGeometry(
  curve,    // 路径曲线
  64,       // 路径分段数（越大越平滑）
  0.5,      // 管道半径（走线宽度）
  8,        // 横截面分段数
  false     // 是否闭合
);
```

**参数说明：**
- `curve`：定义走线路径的曲线对象
- `tubularSegments`：沿路径的分段数，影响弯曲处的平滑度
- `radius`：管道半径，对应走线宽度
- `radialSegments`：横截面的圆形分段数，影响圆形的平滑度
- `closed`：是否闭合成环形

### 2. CatmullRomCurve3（平滑曲线）

用于在多个点之间创建平滑的曲线路径。

```tsx
// 创建曲线，自动在点之间插值
const curve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(x1, y1, z1),
  new THREE.Vector3(x2, y2, z2),
  new THREE.Vector3(x3, y3, z3),
]);
```

**特点：**
- 自动在控制点之间生成平滑曲线
- 曲线会经过所有控制点
- 适合创建自然的走线路径

### 3. CylinderGeometry（圆柱几何体）

用于创建焊盘（Pad）。

```tsx
<cylinderGeometry 
  args={[
    radius,    // 顶部半径
    radius,    // 底部半径
    0.3,       // 高度（焊盘厚度）
    32         // 圆周分段数
  ]} 
/>
```

**焊盘渲染技巧：**
- 使用扁平的圆柱体（高度很小）
- 旋转 -90° 使其水平放置
- 使用高金属度材质（metalness: 0.9）模拟金属表面

### 4. 材质属性对比

不同元素使用不同的材质属性来模拟真实效果：

| 元素 | 颜色 | roughness | metalness | 说明 |
|------|------|-----------|-----------|------|
| PCB 板 | `#1a5f1a` | 0.8 | 0.1 | 墨绿色，粗糙，非金属 |
| 焊盘 | `#d4af37` | 0.3 | 0.9 | 金色，光滑，高金属度 |
| 铜走线 | `#c87533` | 0.4 | 0.8 | 铜色，较光滑，金属 |

### 5. 走线颜色编码

在实际 PCB 设计中，不同类型的走线通常用不同颜色标识：

```tsx
const traces = [
  { color: "#ff6b6b" },  // 红色 - 电源线（VCC）
  { color: "#4ecdc4" },  // 青色 - 地线（GND）
  { color: "#ffe66d" },  // 黄色 - 信号线
];
```

## 代码结构

### Pad 组件（焊盘）

```tsx
function Pad({ position, radius = 2, color = "#d4af37" }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius, radius, 0.3, 32]} />
      <meshStandardMaterial 
        color={color} 
        roughness={0.3} 
        metalness={0.9} 
      />
    </mesh>
  );
}
```

### Trace 组件（走线）

```tsx
function Trace({ points, width = 0.5, color = "#c87533" }) {
  // 转换为 Vector3 数组
  const vectors = points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  
  // 创建平滑曲线
  const curve = new THREE.CatmullRomCurve3(vectors);
  
  // 创建管道几何体
  const tubeGeometry = new THREE.TubeGeometry(curve, 64, width, 8, false);
  
  return (
    <mesh geometry={tubeGeometry}>
      <meshStandardMaterial 
        color={color} 
        roughness={0.4} 
        metalness={0.8} 
      />
    </mesh>
  );
}
```

## 实际应用场景

### 1. 简单电路布局

适合展示基本的电路连接关系：
- 直线走线
- 简单的弯曲
- 清晰的标注

### 2. 复杂电路布局

适合展示真实的 PCB 设计：
- 网格状焊盘布局
- 多种走线路径（水平、垂直、对角、S形）
- 密集的元件排布

### 3. 故障检测可视化

在你的工业故障检测软件中的应用：
- 用不同颜色标识故障走线
- 高亮显示异常焊盘
- 动画展示电流流向
- 3D 视角检查短路/断路

## 性能优化建议

### 1. 实例化渲染

当有大量相同的焊盘时，使用 `InstancedMesh` 提高性能：

```tsx
// 不推荐：为每个焊盘创建独立的 mesh
{pads.map(pad => <Pad position={pad} />)}

// 推荐：使用实例化渲染
<instancedMesh args={[geometry, material, count]}>
  {/* 设置每个实例的位置 */}
</instancedMesh>
```

### 2. 降低几何体复杂度

根据视角距离调整分段数：
- 近景：`tubularSegments: 64, radialSegments: 16`
- 远景：`tubularSegments: 32, radialSegments: 8`

### 3. 使用 LOD（细节层次）

根据相机距离切换不同精度的模型。

## 练习建议

✅ **基础练习**
1. 修改走线颜色，创建自己的配色方案
2. 调整走线宽度，观察视觉效果
3. 添加更多焊盘，创建新的电路布局

✅ **进阶练习**
1. 创建弧形走线（使用更多控制点）
2. 实现走线的动画效果（发光、流动）
3. 添加 Via（过孔）渲染
4. 实现多层板效果（不同高度的走线）

✅ **实战练习**
1. 导入真实的 PCB 设计数据（Gerber 文件）
2. 实现走线的交互选择功能
3. 添加测量工具（距离、角度）
4. 实现故障标注和高亮功能

## 下一步学习

- **Demo 03**: 元件渲染（电阻、电容、芯片等）
- **Demo 04**: 多层板渲染和透视效果
- **Demo 05**: 动画和交互（点击、悬停、选择）
- **Demo 06**: 导入真实 PCB 数据

## 相关资源

- [Three.js TubeGeometry 文档](https://threejs.org/docs/#api/en/geometries/TubeGeometry)
- [Three.js Curve 文档](https://threejs.org/docs/#api/en/extras/curves/CatmullRomCurve3)
- [PCB 设计规范](https://www.pcbway.com/pcb_prototype/PCB_Designing_Guidelines.html)

---

## Q&A

### Q1: 什么时候使用 `<mesh>`？

**简单回答：** 需要渲染有体积、有材质、能接受光照的 3D 物体时使用 `<mesh>`。

**详细说明：**

`<mesh>` 是 React Three Fiber 中最常用的标签，用于渲染可见的 3D 几何体对象。

**基本结构：**
```tsx
<mesh position={[x, y, z]} rotation={[x, y, z]}>
  <geometry />      {/* 几何体：定义形状 */}
  <material />      {/* 材质：定义外观 */}
</mesh>
```

**使用场景：**

1. **渲染基础几何体**
```tsx
// 立方体（如 PCB 板）
<mesh>
  <boxGeometry args={[100, 2, 60]} />
  <meshStandardMaterial color="#1a5f1a" />
</mesh>

// 球体
<mesh>
  <sphereGeometry args={[1, 32, 32]} />
  <meshStandardMaterial color="red" />
</mesh>

// 圆柱体（如焊盘）
<mesh rotation={[-Math.PI / 2, 0, 0]}>
  <cylinderGeometry args={[2, 2, 0.3, 32]} />
  <meshStandardMaterial color="#d4af37" metalness={0.9} />
</mesh>
```

2. **需要光照效果的物体**
```tsx
<mesh>
  <boxGeometry />
  <meshStandardMaterial />  {/* 基于物理的材质，支持光照 */}
</mesh>
```

3. **需要投射/接收阴影**
```tsx
<mesh castShadow receiveShadow>
  <boxGeometry />
  <meshStandardMaterial />
</mesh>
```

**何时不使用 `<mesh>`：**

| 场景 | 使用标签 | 示例 |
|------|---------|------|
| 渲染线条、轨迹 | `<line>` | 坐标轴、路径预览 |
| 渲染粒子、点云 | `<points>` | 粒子系统、星空 |
| 组织多个对象 | `<group>` | 将多个 mesh 组合 |
| 渲染文字 | `<Text>` | 标签、说明文字 |

**本 Demo 中的例子：**

```tsx
// ✅ 使用 mesh - PCB 板（有体积的立方体）
<mesh position={[0, 1, 0]} castShadow receiveShadow>
  <boxGeometry args={[100, 2, 60]} />
  <meshStandardMaterial color="#1a5f1a" />
</mesh>

// ✅ 使用 mesh - 焊盘（有体积的圆柱体）
<mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
  <cylinderGeometry args={[radius, radius, 0.3, 32]} />
  <meshStandardMaterial color="#d4af37" metalness={0.9} />
</mesh>

// ✅ 使用 mesh - 走线（有体积的管道）
<mesh geometry={tubeGeometry}>
  <meshStandardMaterial color="#c87533" metalness={0.8} />
</mesh>

// ❌ 不使用 mesh - 坐标轴（只是线条）
<line>
  <bufferGeometry>
    <bufferAttribute args={[positions, 3]} />
  </bufferGeometry>
  <lineBasicMaterial color="red" />
</line>
```

**常用材质对比：**

| 材质类型 | 是否受光照影响 | 适用场景 |
|---------|--------------|---------|
| `meshBasicMaterial` | ❌ 否 | 纯色物体、不需要光照效果 |
| `meshStandardMaterial` | ✅ 是 | 大多数场景，基于物理渲染 |
| `meshPhongMaterial` | ✅ 是 | 需要高光效果的物体 |
| `lineBasicMaterial` | ❌ 否 | 线条渲染 |

**记忆口诀：**
- 有体积 → 用 `<mesh>`
- 只是线 → 用 `<line>`
- 只是点 → 用 `<points>`
- 只是组 → 用 `<group>`

