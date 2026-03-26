import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles.css";
import { apiRequest, getAuthToken, jsonBody } from "../lib/api";
import { normalizePosts } from "../lib/posts";

function InlineCreatePost({ onPostCreated }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      return;
    }

    if (!getAuthToken()) {
      setStatus("Log in first to publish from the dashboard.");
      return;
    }

    setSending(true);
    setStatus("");

    try {
      const newPost = await apiRequest("/api/posts/", {
        method: "POST",
        body: jsonBody({
          title,
          content: {
            version: 1,
            metadata: {
              description: content.trim(),
            },
            blocks: [
              {
                type: "paragraph",
                content: content.trim(),
              },
            ],
            markdown: content.trim(),
          },
          published: true,
        }),
      });

      setTitle("");
      setContent("");
      onPostCreated(newPost);
    } catch (error) {
      setStatus(error.message || "Failed to create post.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      padding: 24,
      marginBottom: 32,
      backdropFilter: "blur(10px)",
      position: "sticky",
      top: 100,
      zIndex: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,0.02)",
    }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input
          placeholder="Give your post a title..."
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={100}
          style={{
            fontFamily: '"Inter", sans-serif', fontSize: 16, fontWeight: 600,
            background: "transparent", border: "none", color: "var(--black)",
            outline: "none", width: "100%",
          }}
        />
        <textarea
          placeholder="Draft a short post or head into the full editor for richer layouts."
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          style={{
            fontFamily: '"Inter", sans-serif', fontSize: 18, lineHeight: 1.5,
            background: "transparent", border: "none", color: "var(--black)",
            outline: "none", resize: "none", width: "100%",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 16, gap: 12 }}>
          <span style={{ color: "var(--gray)", fontSize: 13 }}>
            {getAuthToken() ? "Publishing with your authenticated account." : "Authentication required to publish."}
          </span>
          <button
            type="submit"
            disabled={sending || !title.trim() || !content.trim()}
            style={{
              background: "var(--black)", color: "var(--white)", padding: "10px 24px",
              borderRadius: 999, fontWeight: 600, fontSize: 15, cursor: "pointer",
              border: "none", opacity: (sending || !title.trim() || !content.trim()) ? 0.5 : 1,
            }}
          >
            {sending ? "Posting..." : "Post"}
          </button>
        </div>
        {status ? <p style={{ color: "var(--red)", fontSize: 13 }}>{status}</p> : null}
      </form>
    </div>
  );
}

function PostCard({ post }) {
  const d = post.created_at ? new Date(post.created_at) : new Date();
  const dateString = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div
      style={{
        display: "flex", gap: 16, padding: "24px 0", borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--border)", flexShrink: 0, overflow: "hidden" }}>
        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${post.id || "new"}`} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{post.author?.username || "writer"}</span>
          <span style={{ color: "var(--gray)", fontSize: 15 }}>· {dateString}</span>
          <span style={{ color: "var(--gray)", fontSize: 15 }}>{post.category}</span>
          {!post.published ? <span style={{ color: "var(--red)", fontSize: 13 }}>Draft</span> : null}
        </div>
        {post.title ? <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: '"Playfair Display", serif' }}>{post.title}</h3> : null}
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--black)", whiteSpace: "pre-wrap" }}>
          {post.excerpt || "No preview available yet."}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/api/posts/")
      .then((data) => {
        setPosts(normalizePosts(data).reverse());
      })
      .catch(() => {
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePostCreated = (newPost) => {
    setPosts((current) => [normalizePosts([newPost])[0], ...current]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="site" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar alwaysSolid={true} />

      <main style={{ flex: 1, paddingTop: 100, paddingBottom: 80, maxWidth: 640, width: "100%", margin: "0 auto", paddingLeft: "4%", paddingRight: "4%" }}>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 700, marginBottom: 32 }}>Home</h1>

        <InlineCreatePost onPostCreated={handlePostCreated} />

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--gray)" }}>Loading feed...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
