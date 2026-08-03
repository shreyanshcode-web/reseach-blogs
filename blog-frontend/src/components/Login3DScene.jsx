import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function GlassSculpture() {
  const meshRef = useRef();

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Slow self-rotation
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.12;
    meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.06;

    // Follow mouse pointer smoothly
    const targetX = state.pointer.x * 1.5;
    const targetY = state.pointer.y * 1.0;
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.05);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.05);
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      {/* TorusKnot geometry creates a gorgeous abstract glass ribbon */}
      <torusKnotGeometry args={[1.1, 0.35, 120, 16, 2, 3]} />
      <meshPhysicalMaterial
        thickness={1.6}
        roughness={0.1}
        clearcoat={1.0}
        clearcoatRoughness={0.05}
        transmission={0.9}
        ior={1.5}
        color="#ffffff"
        attenuationColor="#ffffff"
        attenuationDistance={1}
      />
    </mesh>
  );
}

export default function Login3DScene() {
  return (
    <div 
      className="absolute inset-0 w-full h-full pointer-events-none" 
      style={{ zIndex: 1, overflow: "hidden" }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.7} />
        
        {/* High-end studio lighting setup for glass shading */}
        <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
        <pointLight position={[-4, 4, -3]} intensity={1.2} color="#e8001d" /> {/* Brand red glow */}
        <pointLight position={[4, -4, 3]} intensity={1.5} color="#b673f8" /> {/* Purple glow */}
        <pointLight position={[0, 5, 0]} intensity={1.0} color="#ffffff" />
        
        <Float speed={2.0} rotationIntensity={0.5} floatIntensity={0.5}>
          <GlassSculpture />
        </Float>
      </Canvas>
    </div>
  );
}
