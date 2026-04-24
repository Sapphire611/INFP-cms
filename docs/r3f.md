---
description: React Three Fiber (R3F) 和 Three.js demo 开发的已验证写法与常见陷阱
---

# R3F / Three.js 开发技能

本项目 threejs demo 系列中实际验证有效的写法，避免重复踩坑。

## 颜色 / 状态驱动

直接用 `<meshStandardMaterial color={colorString} />` prop 驱动颜色，不要用 `setColorAt`。

```tsx
// ✅ 正确：颜色随 React state 变化
const [color, setColor] = useState("orange");
<mesh>
  <meshStandardMaterial color={color} />
</mesh>

// ❌ 避免：手动 setColorAt + needsUpdate（InstancedMesh 专用，普通 Mesh 不需要）
```

## InstancedMesh 颜色陷阱

`InstancedMesh` 的 `setColorAt` 必须在 mesh 挂载后调用，且每次修改后需要设置 `instanceColor.needsUpdate = true`。

**球数 ≤ 200 时，直接改用独立 `<Sphere>` 组件**，避免 InstancedMesh 的时机问题：

```tsx
// ✅ 少量对象：独立 Sphere，颜色用 prop 驱动
{items.map((item) => (
  <Sphere key={item.id} position={item.pos}>
    <meshStandardMaterial color={item.color} />
  </Sphere>
))}

// InstancedMesh 适合 1000+ 对象的性能场景
```

## Hover / Click 交互

用 R3F 内置事件，不要手写 Raycaster：

```tsx
<mesh
  onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
  onPointerOut={() => setHovered(false)}
  onClick={(e) => { e.stopPropagation(); handleClick(); }}
>
```

## 隐藏实例

少量对象直接条件渲染，不用缩放矩阵为 0 的技巧（那是 InstancedMesh 专用）：

```tsx
// ✅ 普通 Mesh
{show && <Sphere position={pos} />}

// InstancedMesh 隐藏才用：matrix.setPosition(0, -9999, 0)
```

## lil-gui 挂载

挂到 canvas 父容器，定位到右上角，useEffect 清理：

```tsx
useEffect(() => {
  const gui = new GUI({ container: containerRef.current });
  gui.domElement.style.cssText = "position:absolute;top:10px;right:10px;left:auto;";

  // 添加控制项...

  return () => gui.destroy();
}, []);
```

## 常见问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| InstancedMesh 颜色不更新 | 忘记 `instanceColor.needsUpdate = true` | 每次 setColorAt 后设置 |
| setColorAt 无效 | mesh 未挂载就调用 | 用 `ref` + useEffect，或改用独立 Sphere |
| lil-gui 位置错乱 | 未指定 container | 传入 canvas 父容器的 ref |
| 点击穿透 | 未 stopPropagation | 在事件回调中加 `e.stopPropagation()` |
