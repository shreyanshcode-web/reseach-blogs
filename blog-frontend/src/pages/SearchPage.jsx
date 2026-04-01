import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { normalizePosts } from "../lib/posts";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    apiRequest("/api/posts/search?limit=40")
      .then((data) => setPosts(normalizePosts(data)))
      .catch(() => setPosts([]));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return posts;
    }
    return posts.filter((post) =>
      [post.title, post.excerpt, post.author?.username, ...(post.tags || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [posts, query]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const url = query.trim()
        ? `/api/posts/search?limit=40&q=${encodeURIComponent(query.trim())}`
        : "/api/posts/search?limit=40";
      apiRequest(url, {
        signal: controller.signal,
      })
        .then((data) => setPosts(normalizePosts(data)))
        .catch((error) => {
          if (error.name !== "AbortError") {
            setPosts([]);
          }
        });
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <section className="ed-page">
      <div className="ed-panel">
        <p className="ed-kicker">Search</p>
        <h1 className="ed-headline" style={{ fontSize: "clamp(38px, 5vw, 72px)" }}>Find bold writing.</h1>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title, author, tag, or excerpt"
          className="ed-input"
        />
      </div>

      <div className="ed-panel">
        <div className="ed-list">
          {filtered.map((post) => (
            <Link key={post.id} to={`/post/${post.id}`} className="ed-item">
              <div className="ed-meta" style={{ marginBottom: 10 }}>
                <span>@{post.author?.username || "writer"}</span>
                <span>·</span>
                <span>{post.category}</span>
              </div>
              <div className="ed-subheadline">{post.title}</div>
              <p className="ed-copy">{post.excerpt}</p>
            </Link>
          ))}
          {!filtered.length ? <div className="ed-muted">No results yet for that search.</div> : null}
        </div>
      </div>
    </section>
  );
}
