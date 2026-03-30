import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { normalizePosts } from "../lib/posts";

export default function DashboardDraftsPage() {
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    apiRequest("/api/analytics/library")
      .then((data) => setDrafts(normalizePosts(data?.written_posts || [])))
      .catch(() => setDrafts([]));
  }, []);

  const filtered = useMemo(() => drafts.filter((post) => !post.published), [drafts]);

  return (
    <section style={{ padding: 28, borderRadius: 30, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(15,23,42,0.08)" }}>
      <p className="eyebrow">Drafts</p>
      <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, marginBottom: 18 }}>Unpublished work</h2>
      <div style={{ display: "grid", gap: 14 }}>
        {filtered.map((post) => (
          <div key={post.id} style={{ padding: 20, borderRadius: 22, background: "rgba(248,250,252,0.92)" }}>
            <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>{post.title}</div>
            <div style={{ color: "var(--gray)", lineHeight: 1.7, marginBottom: 12 }}>{post.excerpt || "Continue shaping this story in the editor."}</div>
            <Link to="/editor" className="btn btn--ghost">Open Editor</Link>
          </div>
        ))}
        {!filtered.length ? <div style={{ color: "var(--gray)" }}>No drafts yet. Your unpublished posts will appear here.</div> : null}
      </div>
    </section>
  );
}
