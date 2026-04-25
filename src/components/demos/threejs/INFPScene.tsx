"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

// 粒子波浪效果
function ParticleWave() {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 8000;

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // 创建球形分布
      const radius = 3 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // 自然绿色系渐变
      const colorMix = Math.random();
      colors[i3] = 0.4 + colorMix * 0.3;     // R
      colors[i3 + 1] = 0.6 + colorMix * 0.3; // G
      colors[i3 + 2] = 0.3 + colorMix * 0.2; // B
    }

    return [positions, colors];
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      const time = state.clock.elapsedTime;

      // 旋转整个粒子系统
      pointsRef.current.rotation.y = time * 0.05;
      pointsRef.current.rotation.x = Math.sin(time * 0.1) * 0.1;

      // 动态更新粒子位置
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const x = positions[i3];
        const y = positions[i3 + 1];
        const z = positions[i3 + 2];

        // 波浪效果
        const distance = Math.sqrt(x * x + y * y + z * z);
        const wave = Math.sin(distance * 2 - time * 2) * 0.05;

        positions[i3 + 1] += wave;
      }

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// 螺旋粒子流
function SpiralParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 3000;

  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const t = (i / particleCount) * Math.PI * 8;
      const radius = 0.5 + (i / particleCount) * 4;

      positions[i3] = Math.cos(t) * radius;
      positions[i3 + 1] = (i / particleCount) * 6 - 3;
      positions[i3 + 2] = Math.sin(t) * radius;
    }

    return positions;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#7fbc8f"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// 爆炸粒子环
function ExplosionRings() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map((ringIndex) => {
        const particleCount = 500;
        const positions = new Float32Array(particleCount * 3);
        const radius = 2 + ringIndex * 1.5;

        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2;
          const i3 = i * 3;

          positions[i3] = Math.cos(angle) * radius;
          positions[i3 + 1] = (Math.random() - 0.5) * 0.5;
          positions[i3 + 2] = Math.sin(angle) * radius;
        }

        const colors = ["#8fbc8f", "#9acd32", "#f4e4a0"];

        return (
          <points key={ringIndex} rotation={[Math.PI / 2, 0, ringIndex * 0.5]}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={particleCount}
                array={positions}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial
              size={0.04}
              color={colors[ringIndex]}
              transparent
              opacity={0.7}
              sizeAttenuation
              blending={THREE.AdditiveBlending}
            />
          </points>
        );
      })}
    </group>
  );
}

// 主场景
function Scene() {
  return (
    <>
      <color attach="background" args={["#1a2e1a"]} />
      <fog attach="fog" args={["#1a2e1a", 5, 20]} />

      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#8fbc8f" />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0.3} fade speed={1} />

      <ParticleWave />
      <SpiralParticles />
      <ExplosionRings />
    </>
  );
}

// 主导出组件
export default function INFPScene() {
  return (
    <div className="w-full h-[600px] relative overflow-hidden bg-gradient-to-b from-emerald-950 via-green-950 to-teal-950">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={75} />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          autoRotate
          autoRotateSpeed={0.5}
          minDistance={5}
          maxDistance={15}
        />
        <Scene />
      </Canvas>

      {/* 标题文字覆盖层 */}
      <div className="absolute top-8 left-8 text-white pointer-events-none z-10">
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-green-200 via-emerald-200 to-teal-200 bg-clip-text text-transparent">
          调停者
        </h1>
        <h2 className="text-2xl mb-4 text-emerald-200">INFP人格</h2>
        <p className="text-sm max-w-xs leading-relaxed text-green-100/90">
          调停者是富有诗意、善良且无私的人，总是热衷于帮助正义事业。
        </p>
      </div>

      {/* 特质标签 */}
      <div className="absolute bottom-8 left-8 flex gap-2 pointer-events-none z-10">
        <span className="px-3 py-1 bg-green-500/20 text-green-200 text-xs rounded-full border border-green-400/30">
          🌿 自然亲和
        </span>
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 text-xs rounded-full border border-emerald-400/30">
          💚 善良温柔
        </span>
        <span className="px-3 py-1 bg-teal-500/20 text-teal-200 text-xs rounded-full border border-teal-400/30">
          📖 富有诗意
        </span>
      </div>

      {/* 右下角提示 */}
      <div className="absolute bottom-8 right-8 text-green-300/60 text-xs pointer-events-none z-10">
        拖动旋转 | 滚轮缩放
      </div>
    </div>
  );
}
