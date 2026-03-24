import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import heroBg from "./assets/hero-bg.mp4";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function cut(t, n = 130) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "..." : t;
}

export default function App() {
  const [posts, setPosts] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/posts/?limit=9`)
      .then(r => r.json()).then(d => setPosts(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="site">
      <nav className={scrolled ? "nav nav--solid" : "nav"}>
        <a href="#" className="logo">The Making<span>.</span>Of</a>
        <div className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#stories" onClick={() => setMenuOpen(false)}>Stories</a>
          <a href="#topics" onClick={() => setMenuOpen(false)}>Topics</a>
          <a href="#" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#" className="nav-cta" onClick={() => setMenuOpen(false)}>Write</a>
        </div>
        <button className="burger" onClick={() => setMenuOpen(o => !o)} aria-label="menu">
          <span className={menuOpen ? "open" : ""} />
          <span className={menuOpen ? "open" : ""} />
          <span className={menuOpen ? "open" : ""} />
        </button>
      </nav>

      <Hero />
      <Ticker />
      <Latest posts={posts} />
      <Manifesto />
      <MakingOf posts={posts} />
      <Topics />
      <Footer />
    </div>
  );
}

function Hero() {
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

const TICKER = ["Technology","Culture","Design","Science","Society","Ideas","Research","Writing"];
function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((t, i) => (
          <span key={i} className="ticker-item">{t} <span className="dot">&#9679;</span></span>
        ))}
      </div>
    </div>
  );
}

function Latest({ posts }) {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const hero = posts[0];
  const rest = posts.slice(1, 4);
  return (
    <section className="section latest" id="stories" ref={ref}>
      <motion.div className="sec-head"
        initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}>
        <p className="sec-label">Latest Stories</p>
        <a href="#" className="sec-more">View all &rarr;</a>
      </motion.div>

      {hero && (
        <motion.a href={"#" + hero.id} className="hero-card"
          initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}>
          <div className="hero-card-img" />
          <div className="hero-card-body">
            <p className="tag">@{hero.author?.username || "anon"} &mdash; {fmtDate(hero.created_at)}</p>
            <h2 className="hero-card-title">{hero.title}</h2>
            <p className="hero-card-excerpt">{cut(hero.content, 200)}</p>
            <span className="read-more">Read the story &rarr;</span>
          </div>
        </motion.a>
      )}

      <div className="cards-row">
        {rest.length === 0 && !hero && <p className="empty">No stories yet.</p>}
        {rest.map((p, i) => (
          <motion.a key={p.id} href={"#" + p.id} className="card"
            initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 + i * 0.08 }}>
            <div className="card-img" />
            <div className="card-body">
              <p className="tag">@{p.author?.username || "anon"} &mdash; {fmtDate(p.created_at)}</p>
              <h3 className="card-title">{p.title}</h3>
              <p className="card-excerpt">{cut(p.content, 100)}</p>
              <span className="read-more">Read &rarr;</span>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}

const MLINES = [
  { t: "Write without fear.", a: false },
  { t: "Read without limits.", a: false },
  { t: "Ideas deserve space.", a: false },
  { t: "This is that space.", a: true },
];
function Manifesto() {
  return (
    <section className="manifesto">
      {MLINES.map((l, i) => <MLine key={i} text={l.t} accent={l.a} />)}
    </section>
  );
}
function MLine({ text, accent }) {
  const ref = useRef();
  const inView = useInView(ref, { once: false, margin: "-15%" });
  return (
    <motion.p ref={ref}
      className={"mline" + (inView ? " vis" : "") + (accent ? " acc" : "")}
      initial={{ opacity: 0, x: -16 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
      transition={{ duration: 0.65 }}>
      {text}
    </motion.p>
  );
}

function MakingOf({ posts }) {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section className="section making" ref={ref}>
      <motion.div className="sec-head"
        initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}>
        <p className="sec-label">We speak in terms of stories</p>
        <a href="#" className="sec-more">All stories &rarr;</a>
      </motion.div>
      <div className="making-grid">
        {posts.length === 0 && <p className="empty">Stories loading...</p>}
        {posts.slice(0, 6).map((p, i) => (
          <motion.a key={p.id} href={"#" + p.id} className="making-card"
            initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.07 }}>
            <div className="making-img">
              <span className="making-num">0{i + 1}</span>
            </div>
            <div className="making-body">
              <h3>The making of the<br /><em>{p.title}</em> story</h3>
              <p className="tag">@{p.author?.username || "anon"} &mdash; {fmtDate(p.created_at)}</p>
              <span className="read-more">Take me there &rarr;</span>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}

const TOPICS = [
  ["01","Technology","Engineering"],
  ["02","Design & Art","Creative"],
  ["03","Science","Research"],
  ["04","Culture","Society"],
  ["05","Philosophy","Thought"],
];
function Topics() {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section className="section topics" id="topics" ref={ref}>
      <motion.p className="sec-label"
        initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}>Explore Topics</motion.p>
      <ul>
        {TOPICS.map(([n, l, t], i) => (
          <motion.li key={n}
            initial={{ opacity: 0, y: 14 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.07 }}>
            <a href="#" className="topic-row">
              <span className="topic-num">{n}</span>
              <span className="topic-name">{l}</span>
              <span className="topic-tag">{t}</span>
              <span className="topic-arrow">&rarr;</span>
            </a>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <p className="logo" style={{ color: "#fff" }}>The Making<span style={{ color: "#e8001d" }}>.</span>Of</p>
          <p className="footer-desc">A blog about ideas that matter.</p>
        </div>
        <div className="footer-cols">
          <div>
            <p className="fcol-head">Navigate</p>
            <a href="#">Stories</a><a href="#">Topics</a><a href="#">About</a>
          </div>
          <div>
            <p className="fcol-head">Connect</p>
            <a href="#">Twitter</a><a href="#">GitHub</a><a href="#">RSS</a>
          </div>
          <div>
            <p className="fcol-head">Legal</p>
            <a href="#">Privacy</a><a href="#">Terms</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2024 The Making Of. All rights reserved.</p>
        <a href="#" className="btn btn--sm">Write a story</a>
      </div>
    </footer>
  );
}
