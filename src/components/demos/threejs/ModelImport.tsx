"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations, Environment, Grid } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GUI from "lil-gui";
import * as THREE from "three";

/**
 * Demo: 3D 模型导入与加载
 *
 * 学习要点：
 * 1. GLTF/GLB 模型加载 - 使用 useGLTF hook
 * 2. 动画系统 - 使用 useAnimations 播放模型动画
 * 3. 文件上传 - 支持本地文件和 URL 加载
 * 4. 模型信息展示 - 顶点数、面数、动画列表
 * 5. 交互控制 - 缩放、旋转、动画播放控制
 */

// ─── 示例模型列表 ─────────────────────────────────────────────────────────────

const EXAMPLE_MODELS = [
  {
    name: "Parrot (Animated)",
    url: "https://threejs.org/examples/models/gltf/Parrot.glb",
    scale: 0.04,
  },
  {
    name: "Horse (Animated)",
    url: "https://threejs.org/examples/models/gltf/Horse.glb",
    scale: 0.02,
  },
  {
    name: "Flamingo (Animated)",
    url: "https://threejs.org/examples/models/gltf/Flamingo.glb",
    scale: 0.02,
  },
  {
    name: "Stork (Animated)",
    url: "https://threejs.org/examples/models/gltf/Stork.glb",
    scale: 0.02,
  },
  {
    name: "Robot (Animated)",
    url: "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
    scale: 0.6,
  },
  {
    name: "LittlestTokyo (Animated)",
    url: "https://threejs.org/examples/models/gltf/LittlestTokyo.glb",
    scale: 0.01,
  }
];

// ─── 模型信息接口 ─────────────────────────────────────────────────────────────

interface ModelInfo {
  vertices: number;
  triangles: number;
  animations: string[];
  materials: number;
  textures: number;
}

// ─── 3D 模型组件 ──────────────────────────────────────────────────────────────

interface Model3DProps {
  url: string;
  scale: number;
  rotation: [number, number, number];
  onLoad?: (info: ModelInfo) => void;
  animationIndex: number;
  animationSpeed: number;
  isPlaying: boolean;
}

function Model3D({ url, scale, rotation, onLoad, animationIndex, animationSpeed, isPlaying }: Model3DProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions, names } = useAnimations(animations, group);

  // 计算模型信息
  useEffect(() => {
    if (!scene || !onLoad) return;

    let vertices = 0;
    let triangles = 0;
    const materials = new Set();
    const textures = new Set();

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        if (geometry.index) {
          vertices += geometry.attributes.position.count;
          triangles += geometry.index.count / 3;
        } else {
          vertices += geometry.attributes.position.count;
          triangles += geometry.attributes.position.count / 3;
        }

        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              materials.add(mat.uuid);
              if (mat.map) textures.add(mat.map.uuid);
            });
          } else {
            materials.add(child.material.uuid);
            if (child.material.map) textures.add(child.material.map.uuid);
          }
        }
      }
    });

    onLoad({
      vertices: Math.round(vertices),
      triangles: Math.round(triangles),
      animations: names,
      materials: materials.size,
      textures: textures.size,
    });
  }, [scene, onLoad, names]);

  // 控制动画播放
  useEffect(() => {
    if (!actions || names.length === 0) return;

    Object.values(actions).forEach((action) => action?.stop());

    if (animationIndex >= 0 && animationIndex < names.length) {
      const action = actions[names[animationIndex]];
      if (action) {
        action.reset();
        action.timeScale = animationSpeed;
        if (isPlaying) {
          action.play();
        }
      }
    }
  }, [actions, names, animationIndex, isPlaying]);

  useEffect(() => {
    if (!actions || names.length === 0 || animationIndex < 0) return;
    const action = actions[names[animationIndex]];
    if (action) {
      action.timeScale = animationSpeed;
    }
  }, [actions, names, animationIndex, animationSpeed]);

  return (
    <group ref={group} scale={scale} rotation={rotation}>
      <primitive object={scene} />
    </group>
  );
}

// ─── 3D 场景组件 ──────────────────────────────────────────────────────────────

interface SceneProps {
  modelUrl: string | null;
  scale: number;
  rotation: [number, number, number];
  onModelLoad?: (info: ModelInfo) => void;
  animationIndex: number;
  animationSpeed: number;
  isPlaying: boolean;
  showGrid: boolean;
}

function Scene({ modelUrl, scale, rotation, onModelLoad, animationIndex, animationSpeed, isPlaying, showGrid }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {showGrid && <Grid args={[100, 100]} cellSize={1} cellThickness={0.5} cellColor="#6b7280" sectionSize={10} sectionThickness={1} sectionColor="#9ca3af" fadeDistance={50} fadeStrength={1} />}

      <Suspense fallback={null}>
        {modelUrl && (
          <Model3D
            url={modelUrl}
            scale={scale}
            rotation={rotation}
            onLoad={onModelLoad}
            animationIndex={animationIndex}
            animationSpeed={animationSpeed}
            isPlaying={isPlaying}
          />
        )}
        <Environment preset="sunset" />
      </Suspense>

      <OrbitControls enableDamping dampingFactor={0.05} minDistance={1} maxDistance={100} />
    </>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function ModelImport() {
  const [modelUrl, setModelUrl] = useState<string | null>(EXAMPLE_MODELS[0].url);
  const [customUrl, setCustomUrl] = useState("");
  const [scale, setScale] = useState(EXAMPLE_MODELS[0].scale);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleLoadModel = useCallback((url: string, modelScale: number) => {
    setLoading(true);
    setError(null);
    setModelUrl(url);
    setScale(modelScale);
    setRotation([0, 0, 0]);
    setAnimationIndex(0);
    setIsPlaying(true);
    setModelInfo(null);
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleCustomUrlLoad = useCallback(() => {
    if (!customUrl.trim()) return;
    handleLoadModel(customUrl, 1);
  }, [customUrl, handleLoadModel]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
      setError('只支持 .glb 和 .gltf 格式的文件');
      return;
    }

    const url = URL.createObjectURL(file);
    handleLoadModel(url, 1);
  }, [handleLoadModel]);

  useEffect(() => {
    const gui = new GUI({ title: "模型控制面板" });

    if (canvasContainerRef.current) {
      const guiDom = gui.domElement;
      guiDom.style.position = "absolute";
      guiDom.style.top = "10px";
      guiDom.style.right = "10px";
      canvasContainerRef.current.appendChild(guiDom);
    }

    const params = {
      scale: scale,
      rotationY: 0,
      animationSpeed: animationSpeed,
      showGrid: showGrid,
      resetCamera: () => {
        setRotation([0, 0, 0]);
      },
    };

    const transformFolder = gui.addFolder("变换控制");
    transformFolder.add(params, "scale", 0.001, 10, 0.001).name("缩放").onChange((value: number) => setScale(value));
    transformFolder.add(params, "rotationY", -Math.PI, Math.PI, 0.01).name("Y轴旋转").onChange((value: number) => setRotation([0, value, 0]));
    transformFolder.add(params, "resetCamera").name("重置视角");

    if (modelInfo && modelInfo.animations.length > 0) {
      const animFolder = gui.addFolder("动画控制");
      const animParams = {
        animation: modelInfo.animations[animationIndex] || "无",
        speed: animationSpeed,
        playing: isPlaying,
      };
      animFolder.add(animParams, "animation", modelInfo.animations).name("动画").onChange((value: string) => {
        const index = modelInfo.animations.indexOf(value);
        setAnimationIndex(index);
      });
      animFolder.add(animParams, "speed", 0.1, 3, 0.1).name("速度").onChange((value: number) => setAnimationSpeed(value));
      animFolder.add(animParams, "playing").name("播放").onChange((value: boolean) => setIsPlaying(value));
    }

    gui.add(params, "showGrid").name("显示网格").onChange((value: boolean) => setShowGrid(value));

    return () => gui.destroy();
  }, [scale, animationSpeed, showGrid, modelInfo, animationIndex, isPlaying]);

  return (
    <div className="flex h-screen w-full gap-4 bg-background p-4">
      <div ref={canvasContainerRef} className="flex-1 overflow-hidden rounded-lg border border-border" style={{ position: "relative" }}>
        <Canvas camera={{ position: [5, 5, 5], fov: 50 }} shadows>
          <Scene
            modelUrl={modelUrl}
            scale={scale}
            rotation={rotation}
            onModelLoad={setModelInfo}
            animationIndex={animationIndex}
            animationSpeed={animationSpeed}
            isPlaying={isPlaying}
            showGrid={showGrid}
          />
        </Canvas>
      </div>

      <div className="flex w-96 flex-col gap-4 h-full overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle>示例模型</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {EXAMPLE_MODELS.map((model, index) => (
              <Button
                key={index}
                variant={modelUrl === model.url ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleLoadModel(model.url, model.scale)}
                disabled={loading}
              >
                {model.name}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>自定义加载</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">从 URL 加载</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="输入 .glb 或 .gltf 文件 URL"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomUrlLoad()}
                />
                <Button onClick={handleCustomUrlLoad} disabled={!customUrl.trim() || loading}>
                  加载
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">从本地上传</label>
              <Input
                type="file"
                accept=".glb,.gltf"
                onChange={handleFileUpload}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">支持 .glb 和 .gltf 格式</p>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {modelInfo && (
          <Card>
            <CardHeader>
              <CardTitle>模型信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">顶点数:</span>
                  <span className="ml-2 font-mono">{modelInfo.vertices.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">三角面:</span>
                  <span className="ml-2 font-mono">{modelInfo.triangles.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">材质数:</span>
                  <span className="ml-2 font-mono">{modelInfo.materials}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">纹理数:</span>
                  <span className="ml-2 font-mono">{modelInfo.textures}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">动画数:</span>
                  <span className="ml-2 font-mono">{modelInfo.animations.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {modelInfo && modelInfo.animations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>动画控制</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">动画列表</label>
                <div className="space-y-1">
                  {modelInfo.animations.map((name, index) => (
                    <Button
                      key={index}
                      variant={animationIndex === index ? "default" : "outline"}
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        setAnimationIndex(index);
                        setIsPlaying(true);
                      }}
                    >
                      {name || `动画 ${index + 1}`}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex-1"
                  variant={isPlaying ? "default" : "outline"}
                >
                  {isPlaying ? "暂停" : "播放"}
                </Button>
                <Button
                  onClick={() => {
                    setAnimationIndex(0);
                    setIsPlaying(true);
                  }}
                  variant="outline"
                >
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>
              <h3 className="text-foreground font-semibold mb-1">加载模型</h3>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>点击示例模型快速加载</li>
                <li>输入 URL 加载在线模型</li>
                <li>上传本地 .glb/.gltf 文件</li>
              </ul>
            </div>
            <div>
              <h3 className="text-foreground font-semibold mb-1">交互控制</h3>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>鼠标左键拖动旋转视角</li>
                <li>鼠标滚轮缩放视图</li>
                <li>鼠标右键拖动平移</li>
                <li>使用右侧 GUI 面板调整参数</li>
              </ul>
            </div>
            <div>
              <h3 className="text-foreground font-semibold mb-1">技术要点</h3>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>useGLTF - 加载 GLTF/GLB 模型</li>
                <li>useAnimations - 控制模型动画</li>
                <li>Environment - 环境光照</li>
                <li>OrbitControls - 相机控制</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}






