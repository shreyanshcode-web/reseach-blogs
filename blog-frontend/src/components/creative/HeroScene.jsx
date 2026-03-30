import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * Enhanced Matrix rain background
 * Keeps the effect shader-only and lightweight, but adds:
 * - denser columns
 * - layered trails
 * - pseudo glyph structure
 * - subtle horizontal scan noise
 * - accent glow variation for a richer cinematic feel
 */

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;

  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float glyph(vec2 uv, float seed) {
    vec2 guv = fract(uv * vec2(1.0, 1.8));
    float rowA = step(0.15, guv.y) * step(guv.y, 0.22);
    float rowB = step(0.42, guv.y) * step(guv.y, 0.49);
    float rowC = step(0.72, guv.y) * step(guv.y, 0.79);

    float colA = step(0.18, guv.x) * step(guv.x, 0.26);
    float colB = step(0.46, guv.x) * step(guv.x, 0.54);
    float colC = step(0.74, guv.x) * step(guv.x, 0.82);

    float patternA = mix(rowA + colB, rowB + colA + colC, step(0.5, hash(seed + 1.7)));
    float patternB = mix(rowC + colA, rowA + rowC + colC, step(0.5, hash(seed + 4.2)));

    return clamp(max(patternA, patternB), 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 centered = uv - 0.5;

    float cols = 58.0;
    vec2 grid = vec2(cols, cols / aspect);
    vec2 cell = floor(uv * grid);
    vec2 local = fract(uv * grid);

    float columnSeed = hash(cell.x * 1.713 + 19.31);
    float speed = mix(0.55, 2.2, columnSeed);
    float streamLength = mix(7.0, 20.0, hash(cell.x * 2.17 + 7.0));
    float streamOffset = hash(cell.x * 9.1) * 40.0;

    float travel = cell.y + uTime * speed * 10.0 + streamOffset;
    float head = mod(travel, grid.y + streamLength);
    float distFromHead = head - cell.y;

    float trail = smoothstep(streamLength, 0.0, distFromHead);
    float headGlow = smoothstep(1.8, 0.0, abs(distFromHead));
    float glyphMask = glyph(local, cell.x + floor(uTime * 8.0) + cell.y * 0.37);
    float flicker = 0.55 + 0.45 * hash2(vec2(cell.x, floor(uTime * 14.0) + cell.y));

    float brightness = trail * glyphMask * flicker;
    brightness += headGlow * 0.95;

    float secondary = smoothstep(streamLength * 0.7, 0.0, distFromHead + 3.0) * 0.22;
    brightness += secondary * glyphMask;

    float vignette = smoothstep(1.05, 0.18, length(centered * vec2(aspect, 1.0)));
    float scan = 0.96 + 0.04 * sin(uv.y * uResolution.y * 0.45 + uTime * 2.4);
    float haze = 0.10 * exp(-9.0 * length(centered * vec2(aspect * 0.8, 0.9)));

    vec3 base = vec3(0.02, 0.42, 0.08) * brightness;
    vec3 glow = vec3(0.22, 0.95, 0.36) * pow(headGlow, 1.6) * 0.95;
    vec3 accent = vec3(0.35, 0.06, 0.08) * pow(headGlow, 3.0) * step(0.9, hash(cell.x * 3.13));

    vec3 color = base + glow + accent + haze * vec3(0.02, 0.12, 0.04);
    color *= vignette * scan;55

    gl_FragColor = vec4(color, clamp(brightness * 0.9 + haze, 0.0, 1.0));
  }
`;

function MatrixPlane({ inView }) {
  const materialRef = useRef();
  const { viewport, size } = useThree();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
  }), [size.height, size.width]);

  useFrame((state) => {
    if (!inView || !materialRef.current) {
      return;
    }

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uResolution.value.set(size.width, size.height);
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
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
