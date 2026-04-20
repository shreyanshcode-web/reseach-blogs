import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest, jsonBody } from "../lib/api";
import { getValidAuthToken } from "../lib/auth";
import { normalizePost } from "../lib/posts";
import PostContentRenderer from "../components/editor/BlockRenderer";

export default function PostViewPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [engagement, setEngagement] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const viewerToken = getValidAuthToken();
  const viewerPayload = useMemo(() => {
    if (!viewerToken) {
      return null;
    }

    try {
      const [, payload] = viewerToken.split(".");
      return JSON.parse(window.atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=")));
    } catch {
      return null;
    }
  }, [viewerToken]);

  useEffect(() => {
    apiRequest(`/api/posts/${id}`)
      .then((data) => {
        setPost(normalizePost(data));
        setError("");
      })
      .catch((err) => {
        setPost(null);
        setError(err.message || "Unable to load this post.");
      });
  }, [id]);

  useEffect(() => {
    if (!viewerPayload || !post) {
      setCanEdit(false);
      return;
    }

    const possibleNames = [
      viewerPayload.username,
      viewerPayload.preferred_username,
      viewerPayload.email,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    setCanEdit(possibleNames.includes(String(post.author?.username || "").toLowerCase()));
  }, [post, viewerPayload]);

  useEffect(() => {
    if (!id) {
      return;
    }

    apiRequest("/api/analytics/view", {
      method: "POST",
      body: jsonBody({
        post_id: Number(id),
        page_path: `/post/${id}`,
      }),
    }).catch(() => {});
  }, [id]);

  async function handleEngagement(type) {
    setEngagement("");
    try {
      await apiRequest("/api/analytics/engage", {
        method: "POST",
        body: jsonBody({
          post_id: Number(id),
          type,
        }),
      });
      setPost((current) => {
        if (!current) {
          return current;
        }

        const next = { ...current };
        if (type === "like") next.like_count += 1;
        if (type === "share") next.share_count += 1;
        if (type === "bookmark") next.bookmark_count += 1;
        if (type === "comment") next.comment_count += 1;
        return next;
      });
      setEngagement(`${type[0].toUpperCase()}${type.slice(1)} recorded.`);
    } catch (err) {
      setEngagement(err.message || "Could not record engagement.");
    }
  }

  if (error) {
    return <div className="ed-panel">{error}</div>;
  }

  if (!post) {
    return <div className="ed-panel">Loading post...</div>;
  }

  return (
    <div className="app-shell__body-grid">
      <main className="app-shell__stack">
        <article className="app-shell__stage-card">
          <p className="app-shell__eyebrow">{post.category || "Story"}</p>
          <h1 className="app-shell__headline" style={{ fontSize: "clamp(32px, 5vw, 64px)", maxWidth: "none" }}>
            {post.title}
          </h1>
          
          <div className="app-shell__meta" style={{ marginBottom: 32 }}>
            <Link to={`/profile/${post.author?.username || ""}`} className="app-shell__tag">
              @{post.author?.username || "writer"}
            </Link>
            <span className="app-shell__tag">
              {new Date(post.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {post.subtitle ? (
            <p className="app-shell__copy" style={{ fontSize: 18, marginBottom: 32, opacity: 0.9 }}>
              {post.subtitle}
            </p>
          ) : null}

          <div className="ed-reading-column">
            <div className="ed-reading-body">
              <PostContentRenderer content={post.content} />
            </div>
          </div>

          <div className="app-shell__action-row" style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid var(--c-glass-border)" }}>
            <button type="button" className="app-shell__button app-shell__button--primary" onClick={() => handleEngagement("like")} disabled={!viewerToken}>
              Applaud ({post.like_count})
            </button>
            <button type="button" className="app-shell__button" onClick={() => handleEngagement("share")} disabled={!viewerToken}>
              Signal ({post.share_count})
            </button>
            {canEdit && (
              <Link to={`/editor/${id}`} className="app-shell__button">Edit Story</Link>
            )}
          </div>
          
          {engagement && <p className="app-shell__copy" style={{ marginTop: 16, fontSize: 13 }}>{engagement}</p>}
          {!viewerToken && <p className="app-shell__copy" style={{ marginTop: 16, fontSize: 13, opacity: 0.6 }}>Sign in to engage with this story.</p>}
        </article>
      </main>

      <aside className="app-shell__stack">
        <section className="app-shell__stage-card">
          <p className="app-shell__eyebrow">Story Integrity</p>
          <div className="app-shell__metric-grid" style={{ gridTemplateColumns: "1fr", gap: "12px" }}>
            <div className="app-shell__metric-card" style={{ minHeight: "auto", padding: "16px" }}>
                <div className="app-shell__metric-label">Total Views</div>
                <div className="app-shell__metric-value" style={{ fontSize: "28px" }}>{post.view_count ?? 0}</div>
            </div>
            <div className="app-shell__metric-card" style={{ minHeight: "auto", padding: "16px" }}>
                <div className="app-shell__metric-label">Unique Readers</div>
                <div className="app-shell__metric-value" style={{ fontSize: "28px" }}>{post.unique_view_count ?? 0}</div>
            </div>
          </div>
        </section>

        <section className="app-shell__stage-card">
          <p className="app-shell__eyebrow">About Creator</p>
          <div className="app-shell__mini-block">
            <div className="app-shell__mini-title">{post.author?.username}</div>
            <div className="app-shell__mini-copy">
              A verified creator on The Making.Of platform.
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
