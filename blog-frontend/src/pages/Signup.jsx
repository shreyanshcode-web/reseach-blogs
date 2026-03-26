import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../styles.css";
import { apiRequest, jsonBody, setAuthToken } from "../lib/api";

function slugifyUsername(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestedUsername = useMemo(() => slugifyUsername(name), [name]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setMessage("");

    try {
      const username = suggestedUsername || slugifyUsername(email.split("@")[0] || "writer");
      await apiRequest("/api/users/register", {
        method: "POST",
        body: jsonBody({ username, email, password }),
      });

      const loginData = await apiRequest("/api/users/login", {
        method: "POST",
        body: jsonBody({ email, password }),
      });

      setAuthToken(loginData.access_token);
      setStatus("success");
      setMessage(`Account created with username @${username}. Redirecting you to the editor.`);
      navigate("/create-post");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Something went wrong. Please try again.");
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
          <Link to="/login" className="nav-cta">Log In</Link>
        </div>
      </nav>

      <section style={{ paddingTop: 160, paddingBottom: 80, maxWidth: 520, margin: "0 auto", padding: "160px 8% 80px" }}>
        <p className="eyebrow">Join Us</p>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, marginBottom: 48 }}>
          Start your<br /><em style={{ color: "var(--red)" }}>journey</em>.
        </h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "var(--gray)" }}>Display name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="John Doe"
              style={{
                fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 500,
                padding: "16px 0", border: "none", borderBottom: "1.5px solid var(--border)",
                background: "transparent", outline: "none", color: "var(--black)",
              }}
            />
            <small style={{ color: "var(--gray)" }}>Backend username will be saved as @{suggestedUsername || "writer_name"}.</small>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "var(--gray)" }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="you@example.com"
              style={{
                fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 500,
                padding: "16px 0", border: "none", borderBottom: "1.5px solid var(--border)",
                background: "transparent", outline: "none", color: "var(--black)",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "var(--gray)" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              placeholder="Create a password"
              style={{
                fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 500,
                padding: "16px 0", border: "none", borderBottom: "1.5px solid var(--border)",
                background: "transparent", outline: "none", color: "var(--black)",
              }}
            />
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ alignSelf: "flex-start", opacity: loading ? 0.6 : 1, marginTop: 12 }}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>

          {message ? (
            <p style={{ color: status === "success" ? "#16a34a" : "var(--red)", fontSize: 14, fontWeight: 500 }}>
              {message}
            </p>
          ) : null}

          <p style={{ fontSize: 13, color: "var(--gray)", marginTop: 24, fontWeight: 500 }}>
            Already have an account? <Link to="/login" style={{ color: "var(--black)", textDecoration: "none", borderBottom: "1px solid var(--black)", paddingBottom: 2 }}>Log in</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
