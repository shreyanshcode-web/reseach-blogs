import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * Matrix ASCII Rain — ULTRA-SAFE VERSION
 * Optimized for low-end/headless environments.
 * Uses lowp precision and minimal math to prevent Context Loss.
 */

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision lowp float;

  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 437.58); }

  void main() {
    vec2 uv = vUv;
    float cols = 40.0;
    vec2 g = floor(uv * vec2(cols, cols / (uResolution.x/uResolution.y)));
    vec2 f = fract(uv * vec2(cols, cols / (uResolution.x/uResolution.y)));

    float h = hash(g.x);
    float speed = 0.5 + h * 1.5;
    float y = mod(g.y + uTime * speed * 10.0, 40.0);
    
    // Simple blocky character simulation
    float bright = max(0.0, 1.0 - (y / 20.0));
    float char = step(0.5, hash(g.x + g.y + floor(uTime * 10.0)));
    
    vec3 color = vec3(0.0, 0.8 * bright * char, 0.1 * bright);
    
    // Vignette
    color *= smoothstep(0.7, 0.3, length(uv - 0.5));

    gl_FragColor = vec4(color, 1.0);
  }
`;

function MatrixPlane({ inView }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const { viewport, size } = useThree();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
  }), []);

  useFrame((state) => {
    if (!inView || !materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uResolution.value.set(size.width, size.height);
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
      />
    </mesh>
  );
}

export default function HeroScene({ inView }) {
  return (
    <group>
      <MatrixPlane inView={inView} />
    </group>
  );
}
