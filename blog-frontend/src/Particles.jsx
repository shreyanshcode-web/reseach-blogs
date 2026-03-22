import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Particles({ count = 600 }) {
  const mesh = useRef();

  const [positions, randoms] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 3); // speed, phase, radius
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      pos[i * 3]     = r * Math.cos(theta) * Math.cos(phi);
      pos[i * 3 + 1] = r * Math.sin(phi);
      pos[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi) - 4;
      rnd[i * 3]     = 0.1 + Math.random() * 0.4;  // speed
      rnd[i * 3 + 1] = Math.random() * Math.PI * 2; // phase
      rnd[i * 3 + 2] = r;                            // radius
    }
    return [pos, rnd];
  }, [count]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
    return g;
  }, [positions]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    const pos = mesh.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      const speed  = randoms[i * 3];
      const phase  = randoms[i * 3 + 1];
      const radius = randoms[i * 3 + 2];
      const angle  = t * speed + phase;
      pos.array[i * 3]     = radius * Math.cos(angle);
      pos.array[i * 3 + 1] = positions[i * 3 + 1] + Math.sin(t * 0.5 + phase) * 0.3;
      pos.array[i * 3 + 2] = radius * Math.sin(angle) - 4;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={mesh} geometry={geo}>
      <pointsMaterial
        size={0.04}
        color="#a080ff"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
