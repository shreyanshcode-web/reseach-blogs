import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll, Environment, Stars, MeshReflectorMaterial, Text } from "@react-three/drei";
import * as THREE from "three";
import Model from "./Model";
import Particles from "./Particles";

// Camera path through the scene
const CURVE_POINTS = [
  new THREE.Vector3(0, 0, 8),
  new THREE.Vector3(-1.5, 0.5, 5),
  new THREE.Vector3(1.8, 0, 2),
  new THREE.Vector3(0.5, -0.5, -1),
  new THREE.Vector3(-1, 0.8, -4),
];
const curve = new THREE.CatmullRomCurve3(CURVE_POINTS, false, "catmullrom", 0.5);

export default function Scene({ start }) {
  const scroll = useScroll();
  const introRef = useRef(0);
  const modelGroup = useRef();

  // Neon lights refs for flickering
  const neon1 = useRef();
  const neon2 = useRef();
  const neon3 = useRef();

  useEffect(() => {
    if (!start) return;
    let t = 0;
    const id = setInterval(() => {
      t += 0.018;
      introRef.current = Math.min(t, 1);
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [start]);

  useFrame((state) => {
    const s = scroll.offset;
    const intro = introRef.current;
    const t = state.clock.getElapsedTime();

    // ── Camera path ──
    if (intro >= 1) {
      const pt = curve.getPoint(s * 0.85);
      const ahead = curve.getPoint(Math.min(s * 0.85 + 0.01, 1));
      state.camera.position.lerp(pt, 0.06);
      const target = new THREE.Vector3().lerpVectors(
        state.camera.position,
        ahead,
        20
      );
      // add mouse parallax on top of path
      target.x += state.mouse.x * 0.4;
      target.y += state.mouse.y * 0.3;
      state.camera.lookAt(target);
    } else {
      // intro: camera pulls back from far
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 8, 0.04);
      state.camera.lookAt(0, 0, 0);
    }

    // ── Flickering neon lights ──
    const flicker = (base, amp, speed, phase) =>
      base + amp * Math.sin(t * speed + phase) * (0.8 + 0.2 * Math.sin(t * 37.3 + phase));

    if (neon1.current) neon1.current.intensity = flicker(6, 2, 3.1, 0);
    if (neon2.current) neon2.current.intensity = flicker(5, 1.5, 4.7, 1.2);
    if (neon3.current) neon3.current.intensity = flicker(4, 1.8, 2.3, 2.5);

    // ── Model subtle drift ──
    if (modelGroup.current) {
      modelGroup.current.rotation.y = t * 0.08;
      modelGroup.current.position.y = Math.sin(t * 0.4) * 0.15;
    }
  });

  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight intensity={0.15} />
      <pointLight ref={neon1} position={[3, 4, 2]}  color="#7850ff" distance={18} />
      <pointLight ref={neon2} position={[-5, 2, -2]} color="#00d4ff" distance={18} />
      <pointLight ref={neon3} position={[1, -3, 3]}  color="#ff3060" distance={14} />
      {/* Static fill */}
      <pointLight position={[0, 8, 0]} intensity={1.5} color="#ffffff" distance={30} />

      <Environment preset="night" />
      <Stars radius={90} depth={70} count={5000} factor={3} saturation={0} fade speed={0.4} />

      {/* ── Reflective floor ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]}>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          blur={[400, 100]}
          resolution={512}
          mixBlur={1}
          mixStrength={60}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050508"
          metalness={0.8}
          mirror={0}
        />
      </mesh>

      {/* ── Grid lines on floor ── */}
      <gridHelper args={[40, 40, "#1a1a2e", "#0d0d1a"]} position={[0, -2.59, 0]} />

      {/* ── Architectural elements ── */}
      {/* Vertical neon bars */}
      <NeonBar position={[-6, 0, -3]} color="#7850ff" height={8} />
      <NeonBar position={[6, 0, -5]}  color="#00d4ff" height={6} />
      <NeonBar position={[-4, 0, -8]} color="#ff3060" height={10} />

      {/* Floating ring accents */}
      <FloatingRing position={[-3, 1, 0]}  rotation={[Math.PI / 2, 0, 0.3]} color="#7850ff" />
      <FloatingRing position={[4, -0.5, -3]} rotation={[0.5, 0.2, 0]}       color="#00d4ff" />

      {/* ── Main model ── */}
      <group ref={modelGroup} position={[1.5, 0, 0]}>
        <Model scale={1.1} />
      </group>

      {/* ── Particles ── */}
      <Particles count={600} />

      {/* ── Post-processing ── */}
      {/* <EffectComposer>
        <DepthOfField
          focusDistance={0.01}
          focalLength={0.15}
          bokehScale={3}
          height={480}
        />
        <Bloom
          intensity={1.6}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.0006, 0.0006]}
        />
        <Noise opacity={0.035} blendFunction={BlendFunction.ADD} />
        <Vignette eskil={false} offset={0.25} darkness={0.95} />
      </EffectComposer> */}
    </>
  );
}

// Thin glowing vertical bar
function NeonBar({ position, color, height }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.material.emissiveIntensity =
      0.6 + 0.4 * Math.sin(t * 2.1 + position[0]);
  });
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[0.04, height, 0.04]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </mesh>
  );
}

// Thin floating torus ring
function FloatingRing({ position, rotation, color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.z = t * 0.3;
    ref.current.position.y = position[1] + Math.sin(t * 0.6) * 0.2;
  });
  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <torusGeometry args={[0.8, 0.015, 16, 80]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        toneMapped={false}
      />
    </mesh>
  );
}
