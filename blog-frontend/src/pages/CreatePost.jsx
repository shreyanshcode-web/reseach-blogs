import { useState } from "react";
import { motion } from "framer-motion";
import "../styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8001";

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/api/posts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setStatus("success");
      setTitle("");
      setContent("");
    } catch (err) {
      setStatus("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="site">
      <nav className="nav nav--solid">
        <a href="/" className="logo">The Making<span>.</span>Of</a>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/#stories">Stories</a>
        </div>
      </nav>

      <section style={{ paddingTop: 120, paddingBottom: 80, maxWidth: 720, margin: "0 auto", padding: "120px 8% 80px" }}>
        <motion.p className="eyebrow"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          New Story
        </motion.p>
        <motion.h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, marginBottom: 48 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}>
          Write your<br /><em style={{ color: 'var(--red)' }}>story</em>.
        </motion.h1>

        <motion.form onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gray)' }}>Title</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Give your story a name..."
              style={{
                fontFamily: '"Playfair Display", serif', fontSize: 24, fontWeight: 700,
                padding: '16px 0', border: 'none', borderBottom: '1.5px solid var(--border)',
                background: 'transparent', outline: 'none', color: 'var(--black)',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--red)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gray)' }}>Content</label>
            <textarea
              value={content} onChange={e => setContent(e.target.value)} required rows={14}
              placeholder="Start writing..."
              style={{
                fontFamily: '"Inter", sans-serif', fontSize: 15, lineHeight: 1.8,
                padding: 20, border: '1.5px solid var(--border)', background: 'transparent',
                outline: 'none', color: 'var(--black)', resize: 'vertical',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--red)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <button type="submit" className="btn" disabled={sending}
            style={{ alignSelf: 'flex-start', opacity: sending ? 0.6 : 1 }}>
            {sending ? "Publishing..." : "Publish Story"}
          </button>

          {status === "success" && (
            <p style={{ color: '#16a34a', fontSize: 14, fontWeight: 500 }}>
              ✓ Story published! <a href="/" style={{ color: 'var(--red)', textDecoration: 'underline' }}>Go home</a>
            </p>
          )}
          {status === "error" && (
            <p style={{ color: 'var(--red)', fontSize: 14, fontWeight: 500 }}>
              Something went wrong. Please try again.
            </p>
          )}
        </motion.form>
      </section>
    </div>
  );
}
