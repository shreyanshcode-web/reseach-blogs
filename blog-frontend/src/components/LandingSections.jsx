import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import "../styles.css";

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function cut(t, n = 130) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "..." : t;
}

const TICKER = ["Technology", "Culture", "Design", "Science", "Society", "Ideas", "Research", "Writing"];
export function Ticker() {
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

export function LatestStories({ posts }) {
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
export function Manifesto() {
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

export function MakingOf({ posts }) {
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

const TOPICS_LIST = [
  ["01", "Technology", "Engineering"],
  ["02", "Design & Art", "Creative"],
  ["03", "Science", "Research"],
  ["04", "Culture", "Society"],
  ["05", "Philosophy", "Thought"],
];
export function Topics() {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section className="section topics" id="topics" ref={ref}>
      <motion.p className="sec-label"
        initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}>Explore Topics</motion.p>
      <ul>
        {TOPICS_LIST.map(([n, l, t], i) => (
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
