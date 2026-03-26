import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Image, Text, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import NormalizeWheel from 'normalize-wheel';

// ── MATH UTILS ───────────────────────────────────────────────────────
const lerp = (p1, p2, t) => p1 + (p2 - p1) * t;
const map = (num, min1, max1, min2, max2) => {
  const num1 = (num - min1) / (max1 - min1);
  return (num1 * (max2 - min2)) + min2;
};

// ── CUSTOM SHADER MATERIAL ──────────────────────────────────────────
const GalleryMaterial = shaderMaterial(
  {
    uTime: 0,
    uSpeed: 0,
    tMap: null,
    uPlaneSizes: [0, 0],
    uImageSizes: [0, 0],
    uViewportSizes: [0, 0],
    uOpacity: 1,
  },
  // Vertex Shader
  `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSpeed;

  void main() {
    vUv = uv;
    vec3 p = position;
    // Wavy distortion based on speed
    p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
  `,
  // Fragment Shader
  `
  precision highp float;
  uniform vec2 uImageSizes;
  uniform vec2 uPlaneSizes;
  uniform sampler2D tMap;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec2 ratio = vec2(
      min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
      min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
    );

    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    vec4 color = texture2D(tMap, uv);
    gl_FragColor = vec4(color.rgb, color.a * uOpacity);
  }
  `
);

extend({ GalleryMaterial });

// ── GALLERY ITEM ─────────────────────────────────────────────────────
function GalleryItem({ item, index, total, scroll, viewport, isWriter, inView }) {
  const meshRef = useRef();
  const matRef = useRef();
  const extra = useRef(0);
  
  // Calculate initial positions
  const { width: viewW, height: viewH } = viewport;
  const planeW = viewW * 0.25;
  const planeH = viewH * 0.4;
  const padding = planeW * 0.1;
  const itemW = planeW + padding;
  const totalW = itemW * total;
  
  const initialX = itemW * index;

  useFrame((state) => {
    if (!meshRef.current || !inView) return;

    const currentX = initialX - scroll.current - extra.current;
    
    // Circular Arc logic from original
    meshRef.current.position.x = currentX;
    meshRef.current.position.y = Math.cos((currentX / totalW) * Math.PI) * (viewH * 2) - (viewH * 1.95);
    meshRef.current.rotation.z = map(currentX, -totalW, totalW, Math.PI * 0.5, -Math.PI * 0.5);

    // Infinite loop logic
    const direction = scroll.current > scroll.last ? 'right' : (scroll.current < scroll.last ? 'left' : null);
    const planeOffset = planeW / 2;
    const viewportOffset = viewW;

    if (direction === 'right' && currentX + planeOffset < -viewportOffset) {
      extra.current -= totalW;
    } else if (direction === 'left' && currentX - planeOffset > viewportOffset) {
      extra.current += totalW;
    }

    // Update shader
    if (matRef.current) {
      matRef.current.uTime = state.clock.elapsedTime;
      matRef.current.uSpeed = Math.abs(scroll.current - scroll.last) * 10;
      matRef.current.uPlaneSizes = [planeW, planeH];
      matRef.current.uViewportSizes = [viewW, viewH];
    }
  });

  const imageUrl = isWriter 
    ? (item.profile_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username || index}`)
    : (item.image_url || `https://picsum.photos/seed/${item.id + 100}/800/600`);

  return (
    <group ref={meshRef}>
      <Image
        url={imageUrl}
        scale={[planeW, planeH]}
        transparent
      >
        <galleryMaterial ref={matRef} transparent />
      </Image>
      
      {/* Title */}
      <Text
        position={[0, -planeH / 2 - 0.5, 0.1]}
        fontSize={0.3}
        font="https://cdn.jsdelivr.net/gh/googlefonts/sora@main/fonts/otf/Sora-Bold.otf"
        color="white"
        anchorX="center"
        maxWidth={planeW}
      >
        {isWriter ? `@${item.username}` : item.title}
      </Text>

      {/* Number */}
      <Text
        position={[0, planeH / 2 + 0.3, 0.1]}
        fontSize={0.15}
        color="rgba(255,255,255,0.5)"
        anchorX="center"
      >
        {index + 1 < 10 ? `0${index + 1}` : index + 1}
      </Text>
    </group>
  );
}

// ── BACKGROUND PLANES ────────────────────────────────────────────────
function BackgroundPlanes({ scroll, viewport, inView }) {
  const count = 30;
  const { width: viewW, height: viewH } = viewport;
  
  const planes = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      x: (Math.random() - 0.5) * viewW * 3,
      y: (Math.random() - 0.5) * viewH * 2,
      speed: 0.5 + Math.random() * 0.5,
      scale: 0.5 + Math.random() * 0.5,
      xExtra: 0
    }));
  }, [viewW, viewH]);

  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current || !inView) return;
    groupRef.current.children.forEach((mesh, i) => {
      const data = planes[i];
      mesh.position.x = data.x - scroll.current * data.speed;
      
      // Vertical movement
      mesh.position.y += 0.01 * data.speed;
      if (mesh.position.y > viewH) mesh.position.y -= viewH * 2;
    });
  });

  return (
    <group ref={groupRef}>
      {planes.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, -5]}>
          <planeGeometry args={[1.6 * p.scale, 0.9 * p.scale]} />
          <meshBasicMaterial color="#333" transparent opacity={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ── MAIN GALLERY VIEW ────────────────────────────────────────────────
function GalleryScene({ items, scroll, isWriter, inView }) {
  const { viewport } = useThree();
  
  // Ensure we have enough items for a seamless loop
  // If total width is too small, the "wrap" logic will show gaps
  const displayItems = useMemo(() => {
    if (items.length === 0) return [];
    // If we have fewer than 8 items, double them to ensure the viewport is always full
    return items.length < 8 ? [...items, ...items, ...items] : [...items];
  }, [items]);

  return (
    <>
      <ambientLight intensity={1} />
      <BackgroundPlanes scroll={scroll} viewport={viewport} inView={inView} />
      {displayItems.map((item, i) => (
        <GalleryItem 
          key={`${item.id || i}-${i}`} 
          item={item} 
          index={i} 
          total={displayItems.length} 
          scroll={scroll} 
          viewport={viewport} 
          isWriter={isWriter}
          inView={inView}
        />
      ))}
    </>
  );
}

/**
 * InfiniteCircularGallery Walkthrough:
 * 1. Scroll State: Uses a useRef scroll object (current, target, last) to handle smooth lerping.
 * 2. Interaction: Listen to 'wheel' events via NormalizeWheel for cross-browser support.
 * 3. Infinite Loop: GalleryItem calculates its position based on (initialX - scroll - extra).
 *    When an item leaves the viewport, it shifts its 'extra' offset to jump to the other side.
 * 4. Circular Path: position.y and rotation.z are mapped to position.x using a cosine curve.
 * 5. Shaders: Ported from OGL, handles speed-based distortion and 'cover' image fitting.
 * 6. Performance: useFrame hooks check 'inView' to pause when off-screen.
 */
export default function InfiniteCircularGallery({ items, title, isWriter, inView = true }) {
  const scroll = useRef({
    current: 0,
    target: 0,
    last: 0,
    ease: 0.05
  });

  const containerRef = useRef();

  useEffect(() => {
    const handleWheel = (e) => {
      const normalized = NormalizeWheel(e);
      scroll.current.target += normalized.pixelY * 0.01;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Sync scroll values
  useFrame(() => {
    scroll.current.last = scroll.current.current;
    scroll.current.current = lerp(scroll.current.current, scroll.current.target, scroll.current.ease);
  });

  return (
    <div ref={containerRef} className="c-infinite-gallery-container" style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: '#050505' }}>
      <div className="c-section-header" style={{ position: 'absolute', top: '5vh', left: '50%', transform: 'translateX(-50%)', zIndex: 10, textAlign: 'center', pointerEvents: 'none' }}>
        <h2 className="c-section-title" style={{ color: 'white', fontSize: '3rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{title}</h2>
        <p className="c-section-subtitle" style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
          {isWriter ? 'The brilliant minds shaping the future.' : 'Curated stories from our top researchers.'}
        </p>
      </div>

      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        dpr={[1, 2]}
      >
        <GalleryScene items={items} scroll={scroll.current} isWriter={isWriter} inView={inView} />
      </Canvas>
      
      <div className="c-gallery-instruction" style={{ position: 'absolute', bottom: '5vh', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
        SCROLL TO EXPLORE
      </div>
    </div>
  );
}
