import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { getPostPlainText, normalizePost } from "../lib/posts";

export default function PostViewPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");

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
        <div className="ed-reading-body">{getPostPlainText(post.content) || post.excerpt || "No readable content available yet."}</div>
      </div>

      <section className="ed-panel ed-reading-column">
        <p className="ed-kicker">Comments</p>
        <h2 className="ed-subheadline">Discussion can live here next.</h2>
        <p className="ed-copy">The surrounding design now keeps the reading experience front and center, so comment threads can be layered in later without cluttering the article.</p>
      </section>
    </article>
  );
}
