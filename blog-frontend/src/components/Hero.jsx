import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import heroBg from "../assets/hero-bg.mp4";
import "../styles.css";

export default function Hero() {
  const ref = useRef();
  const matrixRef = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    const canvas = matrixRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    const chars = "01アイウエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let animationFrame;
    let intervalId;
    let columns = [];
    let fontSize = 16;

    function setupCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      fontSize = Math.max(14, Math.floor(canvas.width / 110));
      const columnCount = Math.max(12, Math.floor(canvas.width / fontSize));
      columns = Array.from({ length: columnCount }, () => Math.floor(Math.random() * canvas.height));
      context.font = `${fontSize}px monospace`;
    }

    function draw() {
      context.fillStyle = "rgba(5, 10, 10, 0.12)";
      context.fillRect(0, 0, canvas.width, canvas.height);

      columns.forEach((y, index) => {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = index * fontSize;
        context.fillStyle = index % 8 === 0 ? "rgba(232, 0, 29, 0.78)" : "rgba(126, 255, 173, 0.72)";
        context.fillText(text, x, y);
        columns[index] = y > canvas.height + Math.random() * 1200 ? 0 : y + fontSize;
      });

      animationFrame = window.requestAnimationFrame(draw);
    }

    setupCanvas();
    context.fillStyle = "#050505";
    context.fillRect(0, 0, canvas.width, canvas.height);
    draw();

    const handleResize = () => setupCanvas();
    window.addEventListener("resize", handleResize);
    intervalId = window.setInterval(() => {
      context.font = `${fontSize}px monospace`;
    }, 1000);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animationFrame);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="hero" ref={ref}>
      <video className="hero-vid" src={heroBg} autoPlay loop muted playsInline />
      <canvas ref={matrixRef} className="hero-matrix" aria-hidden="true" />
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
          <Link to="/home" className="btn">Open the feed</Link>
        </motion.div>
      </div>
      <div className="scroll-hint">
        <span>Scroll</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}
