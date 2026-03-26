import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { shaderMaterial, Image, Text } from '@react-three/drei';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ── CUSTOM SHADER MATERIAL ──────────────────────────────────────────
// Inspired by shaders-on-scroll Perlin noise distortion
const BlogDistortMaterial = shaderMaterial(
  {
    uTime: 0,
    uStrength: 0,
    uOpacity: 1,
    uTexture: new THREE.Texture(),
  },
  // Vertex Shader
  `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uStrength;

  // Simple noise function (Intensified)
  float noise(vec2 p) {
    return sin(p.x * 12.0 + uTime * 2.0) * cos(p.y * 12.0 + uTime * 2.0) * 0.2;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Distort based on scroll strength and noise (Increased Strength)
    float distortion = noise(vUv) * uStrength * 1.5;
    pos.z += distortion * 4.0;
    pos.y += sin(pos.x * 3.0 + uTime * 2.0) * uStrength * 0.4;
    pos.x += cos(pos.y * 3.0 + uTime * 2.0) * uStrength * 0.2;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
  `,
  // Fragment Shader
  `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform float uStrength;

  void main() {
    vec2 uv = vUv;
    
    // RGB Shift based on strength (Increased)
    float shift = uStrength * 0.12;
    float r = texture2D(uTexture, uv + vec2(shift, 0.0)).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - vec2(shift, 0.0)).b;
    
    vec4 color = vec4(r, g, b, uOpacity);
    
    // Add a slight blueish tint as it distorts
    color.rgb += vec3(0.0, 0.1, 0.4) * uStrength * 0.6;
    
    gl_FragColor = color;
  }
  `
);

extend({ BlogDistortMaterial });

// ── INDIVIDUAL BLOG CARD ─────────────────────────────────────────────
function BlogCard({ post, index, scrollSpeed, inView }) {
  const meshRef = useRef();
  const matRef = useRef();
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    // STOP RENDERING IF NOT IN VIEW
    if (!inView || !matRef.current) return;

    matRef.current.uTime = state.clock.elapsedTime;
    // Map scroll speed to distortion strength
    const targetStrength = Math.abs(scrollSpeed.current) * 0.1 + (hovered ? 0.2 : 0);
    matRef.current.uStrength = THREE.MathUtils.lerp(matRef.current.uStrength, targetStrength, 0.1);
  });

  // Robust Image Fallback for Shaders
  const placeholders = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=1600&auto=format&fit=crop"
  ];

  const imageUrl = post.image_url || placeholders[index % placeholders.length];

  return (
    <group position={[0, -index * 6, 0]}>
      <Image
        ref={meshRef}
        url={imageUrl}
        scale={[8, 5]}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <blogDistortMaterial ref={matRef} transparent />
      </Image>
      
      <Text
        position={[0, -3.2, 0.5]}
        fontSize={0.6}
        font="https://cdn.jsdelivr.net/gh/googlefonts/sora@main/fonts/otf/Sora-Bold.otf"
        color="white"
        anchorX="center"
        maxWidth={8}
      >
        {post.title}
      </Text>
      
      <Text
        position={[0, -4.2, 0.5]}
        fontSize={0.3}
        color="#ccc"
        anchorX="center"
      >
        Rank #{index + 1} • {post.author}
      </Text>
    </group>
  );
}

// ── SECTION COMPONENT ──────────────────────────────────────────────
export default function CreativeTopBlogs({ posts = [], inView }) {
  const scrollSpeed = useRef(0);
  const containerRef = useRef();

  useEffect(() => {
    // Track scroll velocity for the shader
    ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        scrollSpeed.current = self.getVelocity() / 1000;
      }
    });
  }, []);

  // Mock data if none provided
  const topPosts = posts.length > 0 ? posts.slice(0, 5) : [
    { id: 1, title: "The Future of Generative AI", author: "Alex Rivera" },
    { id: 2, title: "Modern WebGL for Creative Devs", author: "Sarah Chen" },
    { id: 3, title: "Designing for the Next Billion", author: "Marcus Thorne" },
    { id: 4, title: "The Ethics of Digital Identity", author: "Elena Rossi" },
    { id: 5, title: "Quantum Computing: A Primer", author: "David Wu" },
  ];

  return (
    <section className="c-full-section" ref={containerRef} id="top-blogs">
      <div className="c-section-header">
        <h2 className="c-section-title">Top Blogs of the Week</h2>
        <p className="c-section-subtitle">The most engaging stories, curated by the community.</p>
      </div>
      
      <div className="c-canvas-container" style={{ height: '3000px' }}>
        <Canvas
          camera={{ position: [0, 0, 10], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: false }}
          style={{ position: 'sticky', top: 0, height: '100vh', background: '#050505' }}
        >
          <ambientLight intensity={0.5} />
          <ScrollContent posts={topPosts} scrollSpeed={scrollSpeed} inView={inView} />
        </Canvas>
      </div>
    </section>
  );
}

function ScrollContent({ posts, scrollSpeed, inView }) {
  const groupRef = useRef();

  useFrame(() => {
    if (!inView || !groupRef.current) return;
    
    // Sync group position with global scroll
    const scrollY = window.scrollY;
    const offset = (scrollY / window.innerHeight) * 6;
    groupRef.current.position.y = offset - 5;
  });

  return (
    <group ref={groupRef}>
      {posts.map((post, i) => (
        <BlogCard key={post.id} post={post} index={i} scrollSpeed={scrollSpeed} inView={inView} />
      ))}
    </group>
  );
}
