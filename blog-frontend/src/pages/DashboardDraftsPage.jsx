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
    <section className="app-shell__stack">
      <section className="app-shell__stage-card app-shell__stage-card--ratio">
        <p className="app-shell__eyebrow">Draft Shelf</p>
        <h1 className="app-shell__section-title">Unpublished work stays inside the same creative workspace.</h1>
        <p className="app-shell__section-copy">
          Drafts now sit on the same widescreen glass stage as the rest of the app, so moving between published performance and unfinished stories feels continuous.
        </p>
        <div className="app-shell__metric-grid">
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Open Drafts</div>
            <div className="app-shell__metric-value">{filtered.length}</div>
            <div className="app-shell__metric-note">Stories still in progress and not yet published.</div>
          </div>
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Tagged</div>
            <div className="app-shell__metric-value">{filtered.filter((post) => (post.tags || []).length > 0).length}</div>
            <div className="app-shell__metric-note">Drafts that already have discovery tags applied.</div>
          </div>
        </div>
      </section>

      <section className="app-shell__stage-card">
        <p className="app-shell__eyebrow">Draft List</p>
        <div className="app-shell__story-list">
          {filtered.map((post) => (
            <article key={post.id} className="app-shell__story-card" style={{ display: "block" }}>
              <div className="app-shell__story-head">
                <span>{post.category}</span>
                <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              <h2 className="app-shell__story-title">{post.title}</h2>
              <p className="app-shell__story-copy">{post.excerpt || "Continue shaping this story in the editor."}</p>
              <div className="app-shell__story-foot">
                {(post.tags || []).slice(0, 4).map((tag) => (
                  <span key={tag} className="app-shell__tag">
                    #{tag}
                  </span>
                ))}
                <Link to={`/editor/${post.id}`} className="app-shell__button">
                  Open Editor
                </Link>
                <Link to={`/post/${post.id}`} className="app-shell__button">
                  Preview
                </Link>
              </div>
            </article>
          ))}
          {!filtered.length ? (
            <div className="app-shell__empty">No drafts yet. Your unpublished posts will appear here.</div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
