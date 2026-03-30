import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { normalizePosts } from "../lib/posts";

function FeedCard({ post }) {
  return (
    <Link to={`/post/${post.id}`} className="ed-item">
      <div className="ed-meta" style={{ marginBottom: 12 }}>
        <span>{post.category}</span>
        <span>·</span>
        <span>@{post.author?.username || "writer"}</span>
      </div>
      <h2 className="ed-subheadline">{post.title}</h2>
      <p className="ed-copy" style={{ marginBottom: 12 }}>{post.excerpt || "Open the post to read the full story."}</p>
      <div className="ed-meta">
        {post.tags?.slice(0, 4).map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
    </Link>
  );
}

export default function HomeFeedPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    apiRequest("/api/posts/?limit=20")
      .then((data) => setPosts(normalizePosts(data)))
      .catch(() => setPosts([]));
  }, []);

  return (
    <section className="ed-page">
      <div className="ed-panel ed-hero">
        <p className="ed-kicker">Home Feed</p>
        <h1 className="ed-headline">Minimal reading, louder writing.</h1>
        <p className="ed-copy">
          A cleaner feed with bolder typography, quieter chrome, and more room for the headline to do the work.
          The goal is to make every story feel more intentional the moment it appears.
        </p>
        <div className="ed-actions">
          <Link to="/editor" className="c-hero__cta">Start Writing</Link>
          <Link to="/search" className="c-hero__cta">Explore Search</Link>
        </div>
      </div>

      <div className="ed-panel">
        <div className="ed-list">
          {posts.map((post) => (
            <FeedCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
