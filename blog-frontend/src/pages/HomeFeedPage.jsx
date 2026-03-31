import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { getValidAuthToken } from "../lib/auth";
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
  const [status, setStatus] = useState("loading");
  const [timelineMeta, setTimelineMeta] = useState({
    personalized: false,
    source: "global",
    cached: false,
    deliveryModel: "fan-out-read",
  });

  useEffect(() => {
    let isMounted = true;

    function loadTimeline() {
      apiRequest("/api/timeline/home?limit=20")
        .then((data) => {
          if (!isMounted) {
            return;
          }

          const normalized = normalizePosts(data?.posts || []);
          setPosts(normalized);
          setTimelineMeta({
            personalized: Boolean(data?.personalized),
            source: data?.source || "global",
            cached: Boolean(data?.cached),
            deliveryModel: data?.delivery_model || "fan-out-read",
          });
          setStatus(normalized.length ? "ready" : "empty");
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }

          setPosts([]);
          setTimelineMeta({
            personalized: false,
            source: "fallback-error",
            cached: false,
            deliveryModel: "fan-out-read",
          });
          setStatus("error");
        });
    }

    loadTimeline();

    const token = getValidAuthToken();
    const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8001").replace(/^http/, "ws");
    const socket = new WebSocket(`${apiBase}/ws/timeline${token ? `?token=${encodeURIComponent(token)}` : ""}`);
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message?.type === "timeline.refresh") {
          setStatus("loading");
          loadTimeline();
        }
      } catch {
        // Ignore invalid websocket payloads.
      }
    };

    return () => {
      isMounted = false;
      socket.close();
    };
  }, []);

  return (
    <section className="ed-page">
      <div className="ed-panel ed-hero">
        <p className="ed-kicker">Homepage</p>
        <h1 className="ed-headline">Read the latest posts in one place.</h1>
        <p className="ed-copy">
          The homepage now uses a timeline-style suggestion system inspired by Twitter: fast cached reads,
          event-driven refreshes, fan-out write timelines for followed creators, and celebrity fallback on read.
        </p>
        <div className="ed-meta" style={{ marginBottom: 18 }}>
          <span>{timelineMeta.personalized ? "Personalized timeline" : "Global timeline"}</span>
          <span>·</span>
          <span>{timelineMeta.cached ? "Redis cached" : "Freshly ranked"}</span>
          <span>·</span>
          <span>{timelineMeta.deliveryModel}</span>
        </div>
        <div className="ed-actions">
          <Link to="/editor" className="c-hero__cta">Start Writing</Link>
          <Link to="/creative" className="c-hero__cta">View Creative Landing</Link>
        </div>
      </div>

      <div className="ed-panel">
        <div className="ed-list">
          {status === "loading" ? (
            <div className="ed-item">
              <h2 className="ed-subheadline">Loading posts...</h2>
              <p className="ed-copy" style={{ marginBottom: 0 }}>
                Pulling the latest published stories for the homepage timeline.
              </p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="ed-item">
              <h2 className="ed-subheadline">Posts could not be loaded.</h2>
              <p className="ed-copy" style={{ marginBottom: 0 }}>
                The feed is available, but the timeline service did not return stories right now. Try refreshing in a moment.
              </p>
            </div>
          ) : null}

          {status === "empty" ? (
            <div className="ed-item">
              <h2 className="ed-subheadline">No posts yet.</h2>
              <p className="ed-copy" style={{ marginBottom: 0 }}>
                Published stories will show up here as soon as writers push them live.
              </p>
            </div>
          ) : null}

          {posts.map((post) => (
            <FeedCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
