import React, { useRef, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Image, Text, Float, MeshDistortMaterial } from '@react-three/drei';
import gsap from 'gsap';

// ── WRITER ITEM (3D PLANE ON A WHEEL) ────────────────────────────────
function WriterItem({ writer, index, total, scrollY, radius, inView }) {
  const meshRef = useRef();
  
  useFrame(() => {
    if (!inView || !meshRef.current) return;

    // Calculate angle based on index and scroll (Increased multiplier for visibility)
    const angle = (index / total) * Math.PI * 2 + (scrollY.current * 0.002);
    
    // Position on a vertical circle (Ferris wheel style)
    const x = Math.sin(angle) * radius;
    const y = Math.cos(angle) * (radius * 0.5); // Flattened oval for perspective
    const z = Math.cos(angle) * radius;
    
    meshRef.current.position.set(x, y, z);
    
    // Always look at the center or slightly towards camera
    meshRef.current.lookAt(0, 0, 0);
  });

  const profileUrl = writer.profile_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${writer.username || index}`;

  return (
    <group ref={meshRef}>
      <Image
        url={profileUrl}
        scale={[2.5, 2.5]}
        transparent
      >
        <circleGeometry args={[1, 64]} />
      </Image>
      <Text
        position={[0, -1.8, 0]}
        fontSize={0.2}
        font="https://cdn.jsdelivr.net/gh/googlefonts/sora@main/fonts/otf/Sora-Bold.otf"
        color="white"
        anchorX="center"
      >
        @{writer.username}
      </Text>
    </group>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────
export default function CreativeTopWriters({ writers = [], inView }) {
  const scrollY = useRef(0);
  const containerRef = useRef();

  useEffect(() => {
    const handleScroll = () => {
      scrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mock data for top writers
  const topWriters = writers.length > 0 ? writers : [
    { id: 1, username: "aara_dev", name: "Aara" },
    { id: 2, username: "shreyas", name: "Shreyas" },
    { id: 3, username: "nebula_9", name: "Nebula" },
    { id: 4, username: "pixel_king", name: "Pixel" },
    { id: 5, username: "cyber_ghost", name: "Ghost" },
    { id: 6, username: "zen_master", name: "Zen" },
    { id: 7, username: "code_witch", name: "Witch" },
    { id: 8, username: "data_monk", name: "Monk" },
  ];

  return (
    <section className="c-full-section c-writers-section" ref={containerRef} id="top-writers">
      <div className="c-section-header">
        <h2 className="c-section-title">Writers of the Day</h2>
        <p className="c-section-subtitle">Meet the minds behind the most impactful research blogs.</p>
      </div>

      <div className="c-canvas-container" style={{ height: '100vh', position: 'relative' }}>
        <Canvas 
          camera={{ position: [0, 0, 15], fov: 35 }}
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: false }}
          style={{ background: '#050505' }}
        >
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <group position={[0, 0, 0]}>
              {topWriters.map((writer, i) => (
                <WriterItem 
                  key={writer.id} 
                  writer={writer} 
                  index={i} 
                  total={topWriters.length} 
                  scrollY={scrollY} 
                  radius={8}
                  inView={inView}
                />
              ))}
            </group>
          </Float>

          {/* Abstract background object to add "Top Writer" prestige */}
          <mesh position={[0, 0, -2]} scale={[4, 4, 4]}>
            <icosahedronGeometry args={[1, 1]} />
            <MeshDistortMaterial
              color="#e8001d"
              speed={3}
              distort={0.4}
              radius={1}
              opacity={0.15}
              transparent
              wireframe
            />
          </mesh>
        </Canvas>
        
        <div className="c-writer-featured">
          <p className="c-featured-label">Featured Today</p>
          <h3 className="c-featured-name">{topWriters[0].username}</h3>
          <p className="c-featured-stats">2.4k Likes • 1.2k Shares</p>
        </div>
      </div>
    </section>
  );
}
