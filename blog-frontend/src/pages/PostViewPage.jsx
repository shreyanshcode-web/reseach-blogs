import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest, jsonBody } from "../lib/api";
import { getPostPlainText, normalizePost } from "../lib/posts";

export default function PostViewPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [engagement, setEngagement] = useState("");

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
    <article className="ed-page">
      <div className="ed-panel ed-reading-column">
        <p className="ed-kicker">Post</p>
        <h1 className="ed-headline" style={{ fontSize: "clamp(46px, 7vw, 92px)" }}>{post.title}</h1>
        <div className="ed-meta" style={{ marginBottom: 24 }}>
          <Link to={`/profile/${post.author?.username || ""}`} style={{ color: "inherit", textDecoration: "none" }}>@{post.author?.username || "writer"}</Link>
          <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          <span>{post.category}</span>
        </div>
        {post.subtitle ? <p className="ed-copy" style={{ fontSize: 22, maxWidth: 680, marginBottom: 24 }}>{post.subtitle}</p> : null}

        <div className="ed-card-grid" style={{ marginBottom: 24 }}>
          <div className="ed-stat-card">
            <strong>{post.like_count}</strong>
            <span className="ed-muted">Likes</span>
          </div>
          <div className="ed-stat-card">
            <strong>{post.share_count}</strong>
            <span className="ed-muted">Shares</span>
          </div>
          <div className="ed-stat-card">
            <strong>{post.bookmark_count}</strong>
            <span className="ed-muted">Bookmarks</span>
          </div>
        </div>

        <div className="ed-actions" style={{ marginTop: 0, marginBottom: 24 }}>
          <button type="button" className="btn btn--ghost" onClick={() => handleEngagement("like")}>Like</button>
          <button type="button" className="btn btn--ghost" onClick={() => handleEngagement("share")}>Share</button>
          <button type="button" className="btn btn--ghost" onClick={() => handleEngagement("bookmark")}>Bookmark</button>
        </div>

        {engagement ? <p className="ed-copy" style={{ marginBottom: 24 }}>{engagement}</p> : null}
        <div className="ed-reading-body">{getPostPlainText(post.content) || post.excerpt || "No readable content available yet."}</div>
      </div>

      <section className="ed-panel ed-reading-column">
        <p className="ed-kicker">Story Context</p>
        <h2 className="ed-subheadline">Signals around the piece.</h2>
        <div className="ed-card-grid" style={{ marginBottom: 18 }}>
          <div className="ed-stat-card">
            <strong>{post.view_count ?? 0}</strong>
            <span className="ed-muted">Views</span>
          </div>
          <div className="ed-stat-card">
            <strong>{post.unique_view_count ?? 0}</strong>
            <span className="ed-muted">Unique readers</span>
          </div>
          <div className="ed-stat-card">
            <strong>{post.comment_count ?? 0}</strong>
            <span className="ed-muted">Comments</span>
          </div>
        </div>
        <p className="ed-copy">
          This article page now surfaces live engagement signals from the backend so the reading experience connects
          directly to analytics instead of ending as a static content view.
        </p>
      </section>
    </article>
  );
}
