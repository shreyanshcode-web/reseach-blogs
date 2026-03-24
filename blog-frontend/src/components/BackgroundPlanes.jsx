import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function FloatingPlane({ viewport, color }) {
  const meshRef = useRef();

  // Initialize random parameters once precisely as bizarro's Background.js
  const params = useMemo(() => {
    const scale = random(0.75, 1);
    const speed = random(0.75, 1);
    const startX = random(-viewport.width * 0.5, viewport.width * 0.5);
    const startY = random(-viewport.height * 0.5, viewport.height * 0.5);
    return { scaleX: 1.6 * scale, scaleY: 0.9 * scale, speed, startX, startY };
  }, [viewport.width, viewport.height]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Constant upward drift
    meshRef.current.position.y += 0.015 * params.speed;

    // Loop logic: if it goes off the top edge, wrap to the bottom!
    if (meshRef.current.position.y > viewport.height * 0.5 + params.scaleY) {
      meshRef.current.position.y -= viewport.height + params.scaleY * 2;
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      position={[params.startX, params.startY, -10]} // Render way behind other items
      scale={[params.scaleX, params.scaleY, 1]}
    >
      <planeGeometry args={[1, 1]} />
      {/* Matching the sleek dark design rather than blinding light #c4c3b6 */}
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
  );
}

export default function BackgroundPlanes({ count = 50 }) {
  const { viewport } = useThree();

  // We generate an array of indices to render multiple planes
  const planes = useMemo(() => new Array(count).fill(0), [count]);

  return (
    <group>
      {planes.map((_, i) => (
        <FloatingPlane 
          key={i} 
          viewport={viewport} 
          // Slightly varied dark slate tones
          color={Math.random() > 0.5 ? "#111116" : "#0a0a0f"} 
        />
      ))}
    </group>
  );
}
