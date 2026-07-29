import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
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
        <p className="sec-label">Start with a blog template</p>
        <Link to="/home" className="sec-more">View all &rarr;</Link>
      </motion.div>

      {hero && (
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}>
          <Link to={`/post/${hero.id}`} className="hero-card">
            <div className="hero-card-img" />
            <div className="hero-card-body">
              <p className="tag">@{hero.author?.username || "anon"} &mdash; {fmtDate(hero.created_at)}</p>
              <h2 className="hero-card-title">{hero.title}</h2>
              <p className="hero-card-excerpt">{cut(hero.content, 200)}</p>
              <span className="read-more">Read the story &rarr;</span>
            </div>
          </Link>
        </motion.div>
      )}

      <div className="cards-row">
        {rest.length === 0 && !hero && <p className="empty">No stories yet.</p>}
        {rest.map((p, i) => (
          <motion.div key={p.id}
            initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 + i * 0.08 }}>
            <Link to={`/post/${p.id}`} className="card">
              <div className="card-img" />
              <div className="card-body">
                <p className="tag">@{p.author?.username || "anon"} &mdash; {fmtDate(p.created_at)}</p>
                <h3 className="card-title">{p.title}</h3>
                <p className="card-excerpt">{cut(p.content, 100)}</p>
                <span className="read-more">Read &rarr;</span>
              </div>
            </Link>
          </motion.div>
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
    <section className="section making" id="features" ref={ref}>
      <motion.div className="sec-head"
        initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}>
        <p className="sec-label">Features to reach the right audience</p>
        <Link to="/search" className="sec-more">All stories &rarr;</Link>
      </motion.div>
      <div className="making-grid">
        {posts.length === 0 && <p className="empty">Stories loading...</p>}
        {posts.slice(0, 6).map((p, i) => (
          <motion.div key={p.id}
            initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.07 }}>
            <Link to={`/post/${p.id}`} className="making-card">
              <div className="making-img">
                <span className="making-num">0{i + 1}</span>
              </div>
              <div className="making-body">
                <h3>The making of the<br /><em>{p.title}</em> story</h3>
                <p className="tag">@{p.author?.username || "anon"} &mdash; {fmtDate(p.created_at)}</p>
                <span className="read-more">Take me there &rarr;</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const TOPICS_LIST = [
  ["01", "Technology", "Engineering", "technology"],
  ["02", "Design & Art", "Creative", "design"],
  ["03", "Science", "Research", "science"],
  ["04", "Culture", "Society", "culture"],
  ["05", "Philosophy", "Thought", "opinion"],
];
export function Topics() {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section className="section topics topics--premium" id="topics" ref={ref}>
      <motion.div className="topics-head"
        initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}>
        <p className="sec-label">Featured Topics</p>
        <h2>Choose a room in the editorial studio.</h2>
      </motion.div>
      <ul className="topic-cloud">
        {TOPICS_LIST.map(([n, l, t, query], i) => (
          <motion.li key={n}
            style={{ "--i": i }}
            initial={{ opacity: 0, y: 30, rotateX: 18 }} animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}>
            <Link to={`/search?q=${encodeURIComponent(query)}`} className="topic-row">
              <span className="topic-num">{n}</span>
              <span className="topic-name">{l}</span>
              <span className="topic-tag">{t}</span>
              <span className="topic-arrow">&rarr;</span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
