import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, extend } from '@react-three/fiber';
import { Text, shaderMaterial } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import { useDrag } from '@use-gesture/react';
import axios from 'axios';
import { API_BASE } from '../lib/api';

// 1. We construct the custom Jelly/Bend Shader based on the bizarro original
const JellyMaterial = shaderMaterial(
  {
    uTime: 0,
    uSpeed: 0,
    uHover: 0,
    tMap: new THREE.Texture(),
    uImageSizes: new THREE.Vector2(1, 1),
    uPlaneSizes: new THREE.Vector2(1, 1),
  },
  // Vertex Shader
  `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uHover;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // The Bizarro bend wave
    p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.05 + uSpeed * 0.3) + (uHover * 0.2);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
  `,
  // Fragment Shader (object-fit: cover implementation)
  `
  uniform vec2 uImageSizes;
  uniform vec2 uPlaneSizes;
  uniform sampler2D tMap;
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
    gl_FragColor = texture2D(tMap, uv);
    if (gl_FragColor.a < 0.1) discard;
  }
  `
);

extend({ JellyMaterial });


function GalleryItem({ post, index, totalItems, planeWidth, planeHeight, scrollCurrent, speed }) {
  const meshRef = useRef();
  const matRef = useRef();
  const [hovered, setHover] = useState(false);

  // Create texture - load async gracefully
  const [texture, setTexture] = useState(null);
  const [imgSize, setImgSize] = useState([1, 1]);

  useEffect(() => {
    let url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";

    // Parse the JSON blocks for image components
    if (post.content && typeof post.content === 'object') {
      const findImg = (obj) => {
        if (!obj) return null;
        if (obj.type === 'image' && obj.props?.url) return obj.props.url;
        if (Array.isArray(obj)) {
          for (let o of obj) { const res = findImg(o); if (res) return res; }
        } else if (typeof obj === 'object') {
          for (let key in obj) { const res = findImg(obj[key]); if (res) return res; }
        }
        return null;
      };
      const found = findImg(post.content);
      if (found) url = found;
      else {
        const abstracts = [
          "https://images.unsplash.com/photo-1550684848-fac1c5b4e853",
          "https://images.unsplash.com/photo-1557672172-298e090bd0f1",
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
          "https://images.unsplash.com/photo-1604871000636-074fa5117945"
        ];
        url = abstracts[index % abstracts.length];
      }
    }

    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
      setImgSize([tex.image.width, tex.image.height]);
    });
  }, [post, index]);

  const { hoverSpring } = useSpring({ hoverSpring: hovered ? 1 : 0, config: { mass: 1, tension: 280, friction: 30 } });

  useFrame((state) => {
    if (!meshRef.current || !matRef.current) return;

    // Bizarro Infinite Math Rings ported from Media.js
    const spacingWidth = planeWidth + 0.5;
    const widthTotal = spacingWidth * totalItems;
    let x = (spacingWidth * index) - scrollCurrent.current;

    // Endless wrap-around loop
    x = ((x % widthTotal) + widthTotal + (widthTotal / 2)) % widthTotal - (widthTotal / 2);

    meshRef.current.position.x = x;

    // Circular Arc curve
    const radius = 75;
    meshRef.current.position.y = Math.cos((x / widthTotal) * Math.PI) * radius - (radius - 0.5);
    meshRef.current.rotation.z = (x / widthTotal) * -Math.PI;

    // Apply uniforms to custom GLSL shader
    matRef.current.uTime = state.clock.elapsedTime;
    matRef.current.uSpeed = speed.current;
    matRef.current.uHover = hoverSpring.get();
  });

  return (
    <group ref={meshRef}>
      <mesh
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        // A real app would use a React Router hook, but simple href is fine for gallery
        onClick={() => window.location.href = '#'}
      >
        <planeGeometry args={[planeWidth, planeHeight, 32, 32]} />
        {texture ? (
          <jellyMaterial
            ref={matRef}
            tMap={texture}
            uImageSizes={new THREE.Vector2(imgSize[0], imgSize[1])}
            uPlaneSizes={new THREE.Vector2(planeWidth, planeHeight)}
            transparent
          />
        ) : (
          <meshBasicMaterial color="#111" />
        )}
      </mesh>

      {/* Title text floating slightly in front of the image plane */}
      <Text
        position={[0, -planeHeight / 2 - 0.4, 0.2]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={planeWidth}
        textAlign="center"
      >
        {post.title}
      </Text>
    </group>
  );
}

export default function CircularGallery({ position = [0, 0, 0] }) {
  const [posts, setPosts] = useState([]);
  const { viewport } = useThree();

  useEffect(() => {
    axios.get(`${API_BASE}/api/posts?limit=12`).then((res) => {
      // Bizarro usually maps 12 objects to keep the math looking dense
      let fetched = res.data.slice(0, 12);

      // If we don't have enough posts yet, duplicate them to fill the ring visually
      if (fetched.length > 0 && fetched.length < 8) {
        while (fetched.length < 8) {
          fetched = [...fetched, ...fetched];
        }
        fetched = fetched.slice(0, 8);
      }
      setPosts(fetched);
    }).catch(console.error);
  }, []);

  const scrollCurrent = useRef(0);
  const scrollTarget = useRef(0);
  const speed = useRef(0);
  const lastScroll = useRef(0);

  // Bind universal drag gestural control for the wheel
  const bind = useDrag(({ movement: [mx], velocity: [vx], direction: [dx], active }) => {
    if (active) {
      scrollTarget.current -= mx * 0.05;
    } else {
      scrollTarget.current -= vx * dx * 5;
    }
  });

  useFrame(() => {
    scrollCurrent.current += (scrollTarget.current - scrollCurrent.current) * 0.05;
    speed.current = scrollCurrent.current - lastScroll.current;
    lastScroll.current = scrollCurrent.current;
  });

  if (posts.length === 0) return null;

  const isMobile = viewport.width < 5;
  const planeW = isMobile ? viewport.width * 0.7 : viewport.width * 0.35;
  const planeH = planeW * 1.3;

  return (
    <group position={position} {...bind()}>
      {posts.map((post, i) => (
        <GalleryItem
          key={i}
          post={post}
          index={i}
          totalItems={posts.length}
          planeWidth={planeW}
          planeHeight={planeH}
          scrollCurrent={scrollCurrent}
          speed={speed}
        />
      ))}
    </group>
  );
}
