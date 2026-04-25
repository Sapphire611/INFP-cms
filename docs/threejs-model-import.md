# Three.js 3D 模型导入功能

## 概述

新增了一个 3D 模型导入和加载的 demo 页面，位于 `/demo/threejs/import`。该功能允许用户导入 GLTF/GLB 格式的 3D 模型，并支持动画播放、模型信息展示和交互控制。

## 功能特性

### 1. 模型加载方式

- **示例模型**: 提供 5 个预设的动画模型（鹦鹉、马、火烈鸟、鹳、机器人）
- **URL 加载**: 支持输入在线 GLTF/GLB 文件 URL
- **本地上传**: 支持上传本地 .glb 和 .gltf 文件

### 2. 模型信息展示

自动计算并显示：
- 顶点数量
- 三角面数量
- 材质数量
- 纹理数量
- 动画数量

### 3. 动画控制

- 动画列表选择
- 播放/暂停控制
- 动画速度调节（0.1x - 3x）
- 动画重置功能

### 4. 交互控制

- **鼠标左键**: 旋转视角
- **鼠标滚轮**: 缩放视图
- **鼠标右键**: 平移视图
- **GUI 面板**: 
  - 模型缩放控制
  - Y 轴旋转控制
  - 网格显示开关
  - 重置视角按钮

## 技术实现

### 核心技术栈

- **React Three Fiber**: React 的 Three.js 渲染器
- **@react-three/drei**: Three.js 辅助工具库
- **useGLTF**: 加载 GLTF/GLB 模型
- **useAnimations**: 控制模型动画
- **lil-gui**: 实时参数调节面板

### 关键代码结构

```typescript
// 模型加载
const { scene, animations } = useGLTF(url);
const { actions, names } = useAnimations(animations, group);

// 动画控制
useEffect(() => {
  const action = actions[names[animationIndex]];
  if (action) {
    action.reset();
    action.timeScale = animationSpeed;
    if (isPlaying) action.play();
  }
}, [actions, names, animationIndex, isPlaying]);

// 模型信息计算
scene.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    // 统计顶点、面数、材质、纹理
  }
});
```

## 使用示例

### 加载示例模型

1. 访问 `/demo/threejs/import`
2. 点击右侧面板中的任一示例模型按钮
3. 模型将自动加载并显示

### 加载自定义模型

**方式 1: URL 加载**
1. 在 "从 URL 加载" 输入框中输入模型 URL
2. 点击 "加载" 按钮或按 Enter 键

**方式 2: 本地上传**
1. 点击 "从本地上传" 的文件选择按钮
2. 选择 .glb 或 .gltf 文件
3. 模型将自动加载

### 控制动画

1. 在 "动画控制" 卡片中选择要播放的动画
2. 使用 "播放/暂停" 按钮控制播放状态
3. 在 GUI 面板中调节动画速度

## 文件位置

- **路由页面**: `src/app/(main)/demo/threejs/import/page.tsx`
- **组件实现**: `src/components/demos/threejs/ModelImport.tsx`
- **导航配置**: `src/app/(main)/demo/threejs/page.tsx`

## 示例模型来源

所有示例模型均来自 Three.js 官方示例库：
- https://threejs.org/examples/models/gltf/

## 注意事项

1. **文件格式**: 仅支持 .glb 和 .gltf 格式
2. **跨域问题**: 加载在线模型时需要目标服务器支持 CORS
3. **文件大小**: 建议模型文件不超过 50MB，以保证加载速度
4. **浏览器兼容**: 需要支持 WebGL 的现代浏览器

## 扩展建议

未来可以考虑添加：
- 模型导出功能
- 截图功能
- 更多光照预设
- 材质编辑器
- 骨骼动画可视化
- VR/AR 支持
