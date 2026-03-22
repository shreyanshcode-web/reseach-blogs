import { Canvas } from "@react-three/fiber";
import { ScrollControls, Scroll, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Scene from "./Scene";
import Loader from "./Loader";
import Cursor from "./Cursor";
import "./styles.css";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
};
const stagger = (i) => ({
  ...fadeUp,
  transition: { duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
});

const WORK = [
  { num: "01", title: "Brand Identity" },
  { num: "02", title: "Digital Experience" },
  { num: "03", title: "Motion Design" },
];
const CAPS = [
  { num: "01", title: "Creative Direction", tag: "Strategy" },
  { num: "02", title: "3D & Motion", tag: "Production" },
  { num: "03", title: "Web Development", tag: "Engineering" },
  { num: "04", title: "Brand Systems", tag: "Design" },
];

// Shared ref so the R3F ticker can update the DOM fill bar
const progressFillEl = { current: null };

export default function App() {
  const [ready, setReady] = useState(false);
  const [start, setStart] = useState(false);
  const [visible, setVisible] = useState(false);
  const fillRef = useRef();

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (start) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [start]);

  // Wire DOM ref into shared object so R3F can reach it
  useEffect(() => {
    progressFillEl.current = fillRef.current;
    return () => { progressFillEl.current = null; };
  }, [visible]);

  return (
    <>
      <Cursor />
      <div className="noise-overlay" />

      {/* Scroll progress — fixed DOM, updated by R3F each frame */}
      {visible && (
        <div className="scroll-progress">
          <span className="scroll-progress-label">Scroll</span>
          <div className="scroll-progress-track">
            <div ref={fillRef} className="scroll-progress-fill" style={{ height: "0%" }} />
          </div>
        </div>
      )}

      {/* Nav */}
      <AnimatePresence>
        {visible && (
          <motion.nav
            className="nav"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="nav-logo">Studio</span>
            <div className="nav-links">
              <a href="#">Work</a>
              <a href="#">About</a>
              <a href="#">Contact</a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Loader */}
      <AnimatePresence>
        {!start && (
          <motion.div
            className="fullscreen-loader"
            exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }}
          >
            <span className="loader-label">Creative Studio</span>
            <h1 className="loader-title">Studio</h1>
            <div className="loader-bar-wrap">
              <div className="loader-bar" />
            </div>
            {ready && (
              <button className="loader-enter" onClick={() => setStart(true)}>
                Enter
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#050508"]} />
        <Suspense fallback={<Loader />}>
          <ScrollControls pages={5} damping={0.25}>
            <Scene start={start} />
            {visible && <ScrollTicker />}
            <Scroll html style={{ width: "100vw" }}>
              <div
                className="overlay"
                style={{ opacity: visible ? 1 : 0, transition: "opacity 1.2s ease 0.2s" }}
              >
                {/* 1 — Hero */}
                <section className="section hero">
                  <motion.p className="hero-eyebrow" {...stagger(0)}>Creative Studio — Est. 2024</motion.p>
                  <motion.h1 className="hero-title" {...stagger(1)}>
                    We build<br /><em>digital worlds</em><br />that move.
                  </motion.h1>
                  <motion.p className="hero-sub" {...stagger(2)}>
                    Crafting immersive experiences at the intersection of design, technology, and storytelling.
                  </motion.p>
                  <motion.button className="cta-button" {...stagger(3)}>
                    View Work <span className="cta-arrow" />
                  </motion.button>
                  <motion.div className="stat-row" {...stagger(4)}>
                    {[["40+", "Projects"], ["12", "Awards"], ["6", "Years"]].map(([n, l]) => (
                      <div className="stat-item" key={l}>
                        <div className="stat-number">{n}</div>
                        <div className="stat-label">{l}</div>
                      </div>
                    ))}
                  </motion.div>
                </section>

                {/* 2 — Manifesto */}
                <section className="section manifesto">
                  <ManifestoLines />
                </section>

                {/* 3 — Work */}
                <section className="section work-section">
                  <motion.p className="section-eyebrow" {...fadeUp}>Selected Work</motion.p>
                  <div className="work-grid">
                    {WORK.map((w, i) => (
                      <motion.div className="work-card" key={w.num} {...stagger(i)}>
                        <div className="work-card-bg" />
                        <div className="work-card-inner">
                          <div className="work-card-num">{w.num}</div>
                          <div className="work-card-title">{w.title}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* 4 — Capabilities */}
                <section className="section caps-section">
                  <motion.p className="section-eyebrow" {...fadeUp}>Capabilities</motion.p>
                  <ul className="caps-list">
                    {CAPS.map((c, i) => (
                      <motion.li className="caps-item" key={c.num} {...stagger(i)}>
                        <span className="caps-item-num">{c.num}</span>
                        <span className="caps-item-title">{c.title}</span>
                        <span className="caps-item-tag">{c.tag}</span>
                      </motion.li>
                    ))}
                  </ul>
                </section>

                {/* 5 — Footer */}
                <section className="section footer-section" style={{ position: "relative" }}>
                  <motion.p className="footer-big" {...fadeUp}>Studio</motion.p>
                  <motion.p className="footer-cta-text" {...stagger(1)}>Let's build something together.</motion.p>
                  <motion.button className="cta-button" style={{ margin: "0 auto 60px" }} {...stagger(2)}>
                    Get in Touch <span className="cta-arrow" />
                  </motion.button>
                  <motion.div className="footer-links" {...stagger(3)}>
                    <a href="#">Twitter</a>
                    <a href="#">Instagram</a>
                    <a href="#">LinkedIn</a>
                    <a href="#">Dribbble</a>
                  </motion.div>
                  <motion.p className="footer-copy" {...stagger(4)}>© 2024 Studio — All rights reserved</motion.p>
                </section>
              </div>
            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>
    </>
  );
}

// R3F ticker — reads scroll offset and pushes it to the DOM fill bar each frame
function ScrollTicker() {
  const scroll = useScroll();
  useFrame(() => {
    if (progressFillEl.current) {
      progressFillEl.current.style.height = `${scroll.offset * 100}%`;
    }
  });
  return null;
}

// Manifesto
function ManifestoLines() {
  const lines = ["We don't make websites.", "We craft experiences.", "Every pixel. Every frame.", "Intentional."];
  return (
    <div style={{ maxWidth: 700 }}>
      {lines.map((line, i) => <ManifestoLine key={i} text={line} delay={i * 0.15} />)}
    </div>
  );
}

function ManifestoLine({ text, delay }) {
  const ref = useRef();
  const inView = useInView(ref, { once: false, margin: "-20%" });
  return (
    <motion.p
      ref={ref}
      className={`manifesto-line${inView ? " active" : ""}`}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {text}
    </motion.p>
  );
}
