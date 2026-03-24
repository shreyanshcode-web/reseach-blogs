import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import heroBg from "../assets/hero-bg.mp4";
import "../styles.css";

export default function Hero() {
  const ref = useRef();
  const inView = useInView(ref, { once: true });
  return (
    <section className="hero" ref={ref}>
      <video className="hero-vid" src={heroBg} autoPlay loop muted playsInline />
      <div className="hero-overlay" />
      <div className="hero-body">
        <motion.p className="eyebrow"
          initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}>
          A blog about ideas that matter
        </motion.p>
        <motion.h1 className="hero-title"
          initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}>
          We are<br /><em>decoding</em><br />meanings.
        </motion.h1>
        <motion.p className="hero-sub"
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}>
          Stories, essays, and deep dives at the intersection of technology, culture, and human experience.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}>
          <a href="#stories" className="btn">Read the stories</a>
        </motion.div>
      </div>
      <div className="scroll-hint">
        <span>Scroll</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}
