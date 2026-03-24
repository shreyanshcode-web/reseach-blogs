import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import "../styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8001";

function InlineCreatePost({ onPostCreated }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/posts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        const newPost = await res.json();
        setTitle("");
        setContent("");
        onPostCreated(newPost);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '24px',
      marginBottom: 32,
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 100,
      zIndex: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.02)'
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input 
          placeholder="Give your post a title..." 
          value={title} onChange={e => setTitle(e.target.value)} 
          maxLength={100}
          style={{
            fontFamily: '"Inter", sans-serif', fontSize: 16, fontWeight: 600,
            background: 'transparent', border: 'none', color: 'var(--black)',
            outline: 'none', width: '100%'
          }} 
        />
        <textarea 
          placeholder="What's happening?" 
          value={content} onChange={e => setContent(e.target.value)} 
          rows={3}
          style={{
            fontFamily: '"Inter", sans-serif', fontSize: 18, lineHeight: 1.5,
            background: 'transparent', border: 'none', color: 'var(--black)',
            outline: 'none', resize: 'none', width: '100%'
          }} 
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button type="submit" disabled={sending || !title.trim() || !content.trim()} 
            style={{
              background: 'var(--black)', color: 'var(--white)', padding: '10px 24px',
              borderRadius: 999, fontWeight: 600, fontSize: 15, cursor: 'pointer',
              border: 'none', opacity: (sending || !title.trim() || !content.trim()) ? 0.5 : 1,
              transition: 'opacity 0.2s, transform 0.1s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {sending ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PostCard({ post }) {
  const d = post.created_at ? new Date(post.created_at) : new Date();
  const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }}
      style={{
        display: 'flex', gap: 16, padding: '24px 0', borderBottom: '1px solid var(--border)',
        cursor: 'pointer', transition: 'background 0.2s ease', 
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--border)', flexShrink: 0, overflow: 'hidden' }}>
        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${post.id || 'new'}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Current User</span>
          <span style={{ color: 'var(--gray)', fontSize: 15 }}>@user</span>
          <span style={{ color: 'var(--gray)', fontSize: 15 }}>· {dateString}</span>
        </div>
        {post.title && <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: '"Playfair Display", serif' }}>{post.title}</h3>}
        <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--black)', whiteSpace: 'pre-wrap' }}>
          {post.content}
        </p>
        <div style={{ display: 'flex', gap: 48, marginTop: 16, color: 'var(--gray)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'color 0.2s' }}
               onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
               onMouseLeave={e => e.currentTarget.style.color = 'var(--gray)'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <span style={{ fontSize: 14 }}>0</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'color 0.2s' }}
               onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
               onMouseLeave={e => e.currentTarget.style.color = 'var(--gray)'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span style={{ fontSize: 14 }}>0</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/posts/`)
      .then(r => r.json())
      .then(d => {
        setPosts(Array.isArray(d) ? d.reverse() : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="site" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar alwaysSolid={true} />
      
      <main style={{ flex: 1, paddingTop: 100, paddingBottom: 80, maxWidth: 640, width: '100%', margin: '0 auto', paddingLeft: '4%', paddingRight: '4%' }}>
        <motion.h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 700, marginBottom: 32 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          Home
        </motion.h1>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <InlineCreatePost onPostCreated={handlePostCreated} />
        </motion.div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>Loading feed...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
