import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "../styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8001";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      // Dummy logic for signup
      await new Promise(resolve => setTimeout(resolve, 800));
      setStatus("success");
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  if (status === "success") {
    return (
      <div className="site" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 24 }}>
        <>
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ fontFamily: '"Playfair Display", serif', fontSize: 36 }}>
            Welcome, {name.split(' ')[0] || "there"}.
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ color: 'var(--gray)' }}>
            Your account has been successfully created.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ marginTop: 24 }}>
            <Link to="/login" className="btn">Continue to Login</Link>
          </motion.div>
        </>
      </div>
    );
  }

  return (
    <div className="site">
      <nav className="nav nav--solid">
        <Link to="/" className="logo">The Making<span>.</span>Of</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/login" className="nav-cta">Log In</Link>
        </div>
      </nav>

      <section style={{ paddingTop: 160, paddingBottom: 80, maxWidth: 520, margin: "0 auto", padding: "160px 8% 80px" }}>
        <motion.p className="eyebrow"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          Join Us
        </motion.p>
        <motion.h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, marginBottom: 48 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}>
          Start your<br /><em style={{ color: 'var(--red)' }}>journey</em>.
        </motion.h1>

        <motion.form onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gray)' }}>Full Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="John Doe"
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
              placeholder="Create a password"
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
            {loading ? "Creating account..." : "Sign Up"}
          </button>

          {status === "error" && (
            <p style={{ color: 'var(--red)', fontSize: 14, fontWeight: 500 }}>
              Something went wrong. Please try again.
            </p>
          )}

          <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 24, fontWeight: 500 }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--black)', textDecoration: 'none', borderBottom: '1px solid var(--black)', paddingBottom: 2 }}>Log in</Link>
          </p>
        </motion.form>
      </section>
    </div>
  );
}
