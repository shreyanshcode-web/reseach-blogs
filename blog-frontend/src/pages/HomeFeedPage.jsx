import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { getValidAuthToken } from "../lib/auth";
import { normalizePosts } from "../lib/posts";

function FeedCard({ post }) {
  return (
    <Link to={`/post/${post.id}`} className="app-shell__story-card">
      <div className="app-shell__story-head">
        <span>{post.category}</span>
        <span className="app-shell__author-name">@{post.author?.username || "writer"}</span>
      </div>
      <h2 className="app-shell__story-title">{post.title}</h2>
      <p className="app-shell__story-copy">{post.excerpt || "Open the post to read the full story."}</p>
      <div className="app-shell__story-foot">
        {(post.tags || []).slice(0, 4).map((tag) => (
          <span key={tag} className="app-shell__tag">
            #{tag}
          </span>
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

    const apiBase = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/^http/, "ws")
      : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
    
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
    <>
      <section className="app-shell__stage-card app-shell__stage-card--ratio">
        <p className="app-shell__eyebrow">Home Timeline</p>
        <h1 className="app-shell__section-title">A full-screen feed that behaves like a live suggestion engine.</h1>
        <p className="app-shell__section-copy">
          This homepage now reads inside the creative landing system while keeping the Twitter-style timeline logic underneath:
          cached fan-out delivery, live refresh signaling, and ranked story hydration on open.
        </p>
        <div className="app-shell__metric-grid">
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Mode</div>
            <div className="app-shell__metric-value">{timelineMeta.personalized ? "Personal" : "Global"}</div>
            <div className="app-shell__metric-note">Whether the feed is tuned to the signed-in reader.</div>
          </div>
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Cache</div>
            <div className="app-shell__metric-value">{timelineMeta.cached ? "Redis" : "Fresh"}</div>
            <div className="app-shell__metric-note">Served from cache when available instead of recomputing every time.</div>
          </div>
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Source</div>
            <div className="app-shell__metric-value">{timelineMeta.source}</div>
            <div className="app-shell__metric-note">Current timeline path used to deliver this feed.</div>
          </div>
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Delivery</div>
            <div className="app-shell__metric-value">{timelineMeta.deliveryModel}</div>
            <div className="app-shell__metric-note">Hybrid feed model inspired by real social timeline systems.</div>
          </div>
        </div>
        <div className="app-shell__action-row" style={{ marginTop: 18 }}>
          <Link to="/editor" className="app-shell__button app-shell__button--primary">
            Start Writing
          </Link>
          <Link to="/creative" className="app-shell__button">
            View Creative Landing
          </Link>
        </div>
      </section>

      <section className="app-shell__stage-card">
        <p className="app-shell__eyebrow">Feed Stories</p>
        <div className="app-shell__story-list">
          {status === "loading" ? (
            <div className="app-shell__empty">Loading the timeline and hydrating the latest story suggestions.</div>
          ) : null}

          {status === "error" ? (
            <div className="app-shell__empty">
              The timeline service did not return stories right now. Refresh again in a moment.
            </div>
          ) : null}

          {status === "empty" ? (
            <div className="app-shell__empty">
              No posts are live yet. Published stories will appear here as soon as writers push them live.
            </div>
          ) : null}

          {posts.map((post) => (
            <FeedCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </>
  );
}
