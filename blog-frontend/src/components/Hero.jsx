import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Float, MeshTransmissionMaterial, Sparkles, Text } from "@react-three/drei";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import * as THREE from "three";
import "../styles.css";

const titleLines = ["Create a blog", "that stands out"];
const topics = ["Essays", "Culture", "Design", "Research", "Technology", "Notes"];

function EditorialSculpture() {
  const groupRef = useRef(null);
  const ringsRef = useRef(null);
  const pagesRef = useRef([]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const scrollDepth = Math.min(window.scrollY / 1200, 1.2);

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.mouse.x * 0.55, 0.045);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0.35 + state.mouse.y * 0.32, 0.045);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 6.4 - scrollDepth * 1.2, 0.035);
    state.camera.lookAt(0, 0.25, 0);

    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.14 + state.mouse.x * 0.16;
      groupRef.current.rotation.x = Math.sin(elapsed * 0.42) * 0.05 - state.mouse.y * 0.08;
      groupRef.current.position.y = Math.sin(elapsed * 0.7) * 0.12 + scrollDepth * 0.3;
      groupRef.current.scale.setScalar(1 + scrollDepth * 0.08);
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.z = elapsed * 0.18;
      ringsRef.current.rotation.x = 0.8 + Math.sin(elapsed * 0.28) * 0.08;
    }

    pagesRef.current.forEach((page, index) => {
      if (!page) return;
      const separation = scrollDepth * (0.22 + index * 0.035);
      page.position.x = page.userData.baseX + Math.sin(elapsed * 0.7 + index) * 0.035 + separation * page.userData.dir;
      page.position.y = page.userData.baseY + Math.sin(elapsed * 0.58 + index * 0.8) * 0.055;
      page.rotation.z = page.userData.baseRot + state.mouse.x * 0.05 + scrollDepth * 0.12 * page.userData.dir;
    });
  });

  return (
    <group ref={groupRef} position={[1.15, 0.15, 0]}>
      <Float speed={1.1} rotationIntensity={0.14} floatIntensity={0.22}>
        <group ref={ringsRef}>
          <mesh rotation={[Math.PI / 2.6, 0.15, 0]}>
            <torusGeometry args={[1.58, 0.018, 32, 180]} />
            <meshStandardMaterial color="#f3efe7" metalness={1} roughness={0.18} envMapIntensity={1.2} />
          </mesh>
          <mesh rotation={[Math.PI / 1.85, 0.95, 0.18]}>
            <torusGeometry args={[1.18, 0.012, 32, 160]} />
            <meshStandardMaterial color="#8e9196" metalness={1} roughness={0.22} envMapIntensity={1.4} />
          </mesh>
        </group>

        {Array.from({ length: 7 }).map((_, index) => {
          const angle = index * 0.62 - 1.8;
          const radius = 1.15 + (index % 3) * 0.18;
          const baseX = Math.cos(angle) * radius;
          const baseY = Math.sin(angle) * 0.72 + (index - 3) * 0.06;
          return (
            <mesh
              key={index}
              ref={(node) => { pagesRef.current[index] = node; }}
              userData={{ baseX, baseY, baseRot: angle * 0.38, dir: index % 2 ? 1 : -1 }}
              position={[baseX, baseY, Math.sin(angle) * 0.5]}
              rotation={[0.18, angle * 0.28, angle * 0.38]}
            >
              <boxGeometry args={[0.92, 1.22, 0.018]} />
              <MeshTransmissionMaterial
                color={index % 2 ? "#f8f5ee" : "#c9ced7"}
                thickness={0.18}
                roughness={0.18}
                transmission={0.72}
                ior={1.35}
                chromaticAberration={0.035}
                anisotropy={0.08}
                distortion={0.08}
                distortionScale={0.12}
                temporalDistortion={0.08}
                transparent
                opacity={0.48}
              />
            </mesh>
          );
        })}

        <mesh position={[0.05, 0.02, 0.05]} rotation={[0.8, 0.4, 0.22]}>
          <icosahedronGeometry args={[0.62, 1]} />
          <meshStandardMaterial color="#f7f2e9" metalness={0.86} roughness={0.14} envMapIntensity={1.8} />
        </mesh>

        <Text position={[-1.5, -1.25, 0.32]} rotation={[0, 0.22, 0]} fontSize={0.14} letterSpacing={0.16} color="#f5f1e8" anchorX="center">
          KNOWLEDGE / SIGNAL / FORM
        </Text>
      </Float>
    </group>
  );
}

function Scene() {
  return (
    <Canvas
      className="hero-canvas"
      dpr={[1, 1.65]}
      camera={{ position: [0, 0.35, 6.4], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#030405"]} />
      <fog attach="fog" args={["#030405", 5.5, 11]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[4, 5, 3]} intensity={2.6} color="#fff6e6" />
      <pointLight position={[-3, 2.2, 2]} intensity={1.2} color="#9fb8ff" />
      <pointLight position={[2.8, -1.4, 3]} intensity={0.6} color="#ff4058" />
      <Suspense fallback={null}>
        <EditorialSculpture />
        <Sparkles count={58} scale={[6, 3.2, 3]} size={1.5} speed={0.18} opacity={0.26} color="#f5f1e8" />
        <ContactShadows position={[0, -1.7, 0]} opacity={0.32} scale={5.8} blur={2.8} far={4} />
      </Suspense>
    </Canvas>
  );
}

function AnimatedTitle({ inView }) {
  let characterIndex = 0;

  return (
    <h1 className="hero-title hero-title--premium" aria-label="Create a blog that stands out">
      {titleLines.map((line, lineIndex) => (
        <motion.span
          className="hero-title-line"
          key={line}
          initial={{ opacity: 0, y: 44, rotateX: 18 }}
          animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.16 + lineIndex * 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          {line.split("").map((character) => {
            characterIndex += 1;
            return (
              <motion.span
                className="hero-char"
                key={`${line}-${characterIndex}`}
                initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
                animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                transition={{ duration: 0.58, delay: 0.24 + characterIndex * 0.018 }}
              >
                {character === " " ? "\u00A0" : character}
              </motion.span>
            );
          })}
        </motion.span>
      ))}
    </h1>
  );
}

export default function Hero() {
  const ref = useRef(null);
  const panelRef = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    const section = ref.current;
    const panel = panelRef.current;
    if (!section) return undefined;

    function handleMove(event) {
      const rect = section.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      section.style.setProperty("--mx", String(x));
      section.style.setProperty("--my", String(y));
      section.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      section.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);

      if (panel) {
        panel.style.transform = `translate3d(${x * -16}px, ${y * -12}px, 0) rotateX(${y * -8}deg) rotateY(${x * 10}deg)`;
        panel.style.setProperty("--panel-x", `${50 + x * 45}%`);
        panel.style.setProperty("--panel-y", `${50 + y * 45}%`);
      }
    }

    function resetPanel() {
      if (panel) {
        panel.style.transform = "translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)";
      }
    }

    section.addEventListener("pointermove", handleMove);
    section.addEventListener("pointerleave", resetPanel);
    return () => {
      section.removeEventListener("pointermove", handleMove);
      section.removeEventListener("pointerleave", resetPanel);
    };
  }, []);

  return (
    <section className="hero hero--premium" ref={ref}>
      <Scene />
      <div className="hero-atmosphere" aria-hidden="true" />
      <div className="hero-grain" aria-hidden="true" />

      <div className="hero-premium-copy">
        <motion.p
          className="eyebrow hero-kicker"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          Editorial publishing system
        </motion.p>
        <AnimatedTitle inView={inView} />
        <motion.p
          className="hero-sub hero-sub--premium"
          initial={{ opacity: 0, y: 22 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, delay: 0.72 }}
        >
          A calm, immersive home for essays, research notes, and culture dispatches — designed like a digital magazine from the near future.
        </motion.p>
        <motion.div
          className="hero-actions hero-actions--premium"
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.86 }}
        >
          <Link to="/auth/signup" className="btn btn--light btn--magnetic">Start writing</Link>
          <Link to="/home" className="btn btn--ghost btn--magnetic">Explore stories</Link>
        </motion.div>
      </div>

      <motion.aside
        ref={panelRef}
        className="glass-editorial-panel"
        initial={{ opacity: 0, y: 80, rotateX: 14 }}
        animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
        transition={{ duration: 1, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="panel-reflection" />
        <div className="panel-nav">
          <strong>The Research Desk</strong>
          <span>Essays</span>
          <span>Topics</span>
          <Link to="/editor">Write</Link>
        </div>
        <div className="panel-feature">
          <span>Featured / 10.02</span>
          <h2>How ideas become movements</h2>
          <p>Longform essays, tagged research, contributor tools, and editorial collections in one luminous workspace.</p>
        </div>
        <div className="panel-stats">
          <span><b>128</b> Essays</span>
          <span><b>24k</b> Reads</span>
          <span><b>18</b> Topics</span>
        </div>
      </motion.aside>

      <motion.nav
        className="hero-topic-pills"
        aria-label="Featured topics"
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 1 }}
      >
        {topics.map((topic, index) => (
          <Link key={topic} to={`/search?q=${encodeURIComponent(topic.toLowerCase())}`} style={{ "--i": index }}>
            {topic}
          </Link>
        ))}
      </motion.nav>

      <div className="scroll-hint scroll-hint--premium">
        <span>Scroll</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}
