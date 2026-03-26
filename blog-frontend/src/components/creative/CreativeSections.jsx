import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import TextReveal from './TextReveal';

gsap.registerPlugin(ScrollTrigger);

/* ── Helpers ── */
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function cut(t, n = 130) {
  if (!t) return '';
  return t.length > n ? t.slice(0, n) + '...' : t;
}

/* ══════════════════════════════════════════
   TICKER
   ══════════════════════════════════════════ */
const TICKER_ITEMS = ['Technology', 'Culture', 'Design', 'Science', 'Society', 'Ideas', 'Research', 'Writing'];

export function CreativeTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="c-ticker">
      <div className="c-ticker__track">
        {items.map((t, i) => (
          <span key={i} className="c-ticker__item">
            {t} <span className="c-ticker__dot">&#9679;</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   LATEST STORIES
   ══════════════════════════════════════════ */
export function CreativeLatestStories({ posts }) {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Stagger entrance for all cards
      gsap.utils.toArray('.c-card, .c-hero-card').forEach((card, i) => {
        gsap.fromTo(card,
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power3.out',
            delay: i * 0.1,
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, [posts]);

  const hero = posts[0];
  const rest = posts.slice(1, 4);

  return (
    <section className="c-section" id="c-stories" ref={sectionRef}>
      <div className="c-section__head">
        <TextReveal as="p" className="c-section__label" stagger={0.02}>
          Latest Stories
        </TextReveal>
        <a href="#" className="c-section__more">View all →</a>
      </div>

      {hero && (
        <a href={'#' + hero.id} className="c-hero-card">
          <div className="c-hero-card__img" />
          <div className="c-hero-card__body">
            <p className="c-tag">@{hero.author?.username || 'anon'} — {fmtDate(hero.created_at)}</p>
            <h2 className="c-hero-card__title">{hero.title}</h2>
            <p className="c-hero-card__excerpt">{cut(hero.content, 200)}</p>
            <span className="c-read-more">Read the story →</span>
          </div>
        </a>
      )}

      <div className="c-cards-row">
        {rest.length === 0 && !hero && <p className="c-empty">No stories yet.</p>}
        {rest.map((p) => (
          <a key={p.id} href={'#' + p.id} className="c-card">
            <div className="c-card__img" />
            <div className="c-card__body">
              <p className="c-tag">@{p.author?.username || 'anon'} — {fmtDate(p.created_at)}</p>
              <h3 className="c-card__title">{p.title}</h3>
              <p className="c-card__excerpt">{cut(p.content, 100)}</p>
              <span className="c-read-more">Read →</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   MANIFESTO
   ══════════════════════════════════════════ */
const MANIFESTO_LINES = [
  { text: 'Write without fear.', accent: false },
  { text: 'Read without limits.', accent: false },
  { text: 'Ideas deserve space.', accent: false },
  { text: 'This is that space.', accent: true },
];

export function CreativeManifesto() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray('.c-mline').forEach((line, i) => {
        gsap.fromTo(line,
          { x: -30, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: line,
              start: 'top 80%',
              end: 'top 30%',
              toggleActions: 'play none none reverse',
              onEnter: () => line.classList.add('is-visible'),
              onLeave: () => line.classList.remove('is-visible'),
              onEnterBack: () => line.classList.add('is-visible'),
              onLeaveBack: () => line.classList.remove('is-visible'),
            },
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="c-manifesto" ref={sectionRef}>
      {MANIFESTO_LINES.map((l, i) => (
        <p key={i} className={`c-mline${l.accent ? ' is-accent' : ''}`}>
          {l.text}
        </p>
      ))}
    </section>
  );
}

/* ══════════════════════════════════════════
   MAKING OF
   ══════════════════════════════════════════ */
export function CreativeMakingOf({ posts }) {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray('.c-making-card').forEach((card, i) => {
        gsap.fromTo(card,
          { y: 50, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            delay: i * 0.08,
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, [posts]);

  return (
    <section className="c-section" ref={sectionRef}>
      <div className="c-section__head">
        <TextReveal as="p" className="c-section__label" stagger={0.02}>
          We speak in terms of stories
        </TextReveal>
        <a href="#" className="c-section__more">All stories →</a>
      </div>

      <div className="c-making-grid">
        {posts.length === 0 && <p className="c-empty">Stories loading...</p>}
        {posts.slice(0, 6).map((p, i) => (
          <a key={p.id} href={'#' + p.id} className="c-making-card">
            <div className="c-making-card__img">
              <span className="c-making-card__num">0{i + 1}</span>
            </div>
            <div className="c-making-card__body">
              <h3>The making of the<br /><em>{p.title}</em> story</h3>
              <p className="c-tag">@{p.author?.username || 'anon'} — {fmtDate(p.created_at)}</p>
              <span className="c-read-more">Take me there →</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   TOPICS
   ══════════════════════════════════════════ */
const TOPICS_LIST = [
  ['01', 'Technology', 'Engineering'],
  ['02', 'Design & Art', 'Creative'],
  ['03', 'Science', 'Research'],
  ['04', 'Culture', 'Society'],
  ['05', 'Philosophy', 'Thought'],
];

export function CreativeTopics() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray('.c-topic-row').forEach((row, i) => {
        gsap.fromTo(row,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out',
            delay: i * 0.08,
            scrollTrigger: {
              trigger: row,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="c-section c-topics" id="c-topics" ref={sectionRef}>
      <TextReveal as="p" className="c-section__label" stagger={0.02}>
        Explore Topics
      </TextReveal>
      <ul>
        {TOPICS_LIST.map(([n, l, t]) => (
          <li key={n}>
            <a href="#" className="c-topic-row">
              <span className="c-topic-num">{n}</span>
              <span className="c-topic-name">{l}</span>
              <span className="c-topic-tag">{t}</span>
              <span className="c-topic-arrow">→</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
