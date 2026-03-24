import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "../styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8001";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      // Dummy logic for login validation
      await new Promise(resolve => setTimeout(resolve, 800));
      if (!email || !password) throw new Error("Missing credentials");
      
      setStatus("success");
      // Handle actual login storage/redirects here if needed
      window.location.href = "/";
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="site">
      <nav className="nav nav--solid">
        <Link to="/" className="logo">The Making<span>.</span>Of</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/signup" className="nav-cta">Sign Up</Link>
        </div>
      </nav>

      <section style={{ paddingTop: 160, paddingBottom: 80, maxWidth: 520, margin: "0 auto", padding: "160px 8% 80px" }}>
        <motion.p className="eyebrow"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          Welcome Back
        </motion.p>
        <motion.h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, marginBottom: 48 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}>
          Log in to your<br /><em style={{ color: 'var(--red)' }}>account</em>.
        </motion.h1>

        <motion.form onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gray)' }}>Email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com"
              style={{
                fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 500,
                padding: '16px 0', border: 'none', borderBottom: '1.5px solid var(--border)',
                background: 'transparent', outline: 'none', color: 'var(--black)',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--red)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gray)' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{
                fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 500,
                padding: '16px 0', border: 'none', borderBottom: '1.5px solid var(--border)',
                background: 'transparent', outline: 'none', color: 'var(--black)',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--red)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <button type="submit" className="btn" disabled={loading}
            style={{ alignSelf: 'flex-start', opacity: loading ? 0.6 : 1, marginTop: 12 }}>
            {loading ? "Logging in..." : "Log In"}
          </button>

          {status === "error" && (
            <p style={{ color: 'var(--red)', fontSize: 14, fontWeight: 500 }}>
              Invalid credentials. Please try again.
            </p>
          )}

          <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 24, fontWeight: 500 }}>
            Don't have an account? <Link to="/signup" style={{ color: 'var(--black)', textDecoration: 'none', borderBottom: '1px solid var(--black)', paddingBottom: 2 }}>Sign up</Link>
          </p>
        </motion.form>
      </section>
    </div>
  );
}
