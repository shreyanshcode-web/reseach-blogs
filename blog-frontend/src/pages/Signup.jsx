import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../auth.css";
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
      navigate("/editor");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="site auth-page">
      <nav className="c-nav c-nav--solid">
        <Link to="/" className="c-nav__logo">The Making<span className="c-dot">.</span>Of</Link>
        <div className="c-nav__links">
          <Link to="/">Home</Link>
          <Link to="/auth/login" className="c-nav__cta">Log In</Link>
        </div>
      </nav>

      <section className="auth-shell">
        <aside className="auth-hero">
          <div>
            <p className="auth-hero__kicker">Join Us</p>
            <h1>
              Start your
              <br />
              <em>creator path.</em>
            </h1>
          </div>

          <p>
            Sign up once, get logged in immediately, and land in the editor so the first thing
            you can do is write. That mirrors the flow you asked for and keeps the onboarding tight.
          </p>

          <div className="auth-hero__meta">
            <div>
              <strong>Auto login</strong>
              <span>No second step after signup</span>
            </div>
            <div>
              <strong>Username</strong>
              <span>Generated from your display name</span>
            </div>
            <div>
              <strong>Redirect</strong>
              <span>Go straight to `/editor`</span>
            </div>
          </div>
        </aside>

        <section className="auth-card">
          <div className="auth-card__header">
            <p className="eyebrow">Signup</p>
            <h2>Create your account</h2>
            <p>Your backend username is generated from the display name, then you’re signed in and routed into the editor.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="signup-name">Display name</label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
                placeholder="John Doe"
              />
              <small>Backend username will be saved as @{suggestedUsername || "writer_name"}.</small>
            </div>

            <div className="auth-field">
              <label htmlFor="signup-email">Email address</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Create a password"
              />
            </div>

            <button type="submit" className="btn auth-submit" disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? "Creating account..." : "Sign Up"}
            </button>

            {message ? (
              <div className={`auth-message ${status === "success" ? "auth-message--success" : "auth-message--error"}`}>
                {message}
              </div>
            ) : null}

            <p className="auth-switch">
              Already have an account? <Link to="/auth/login">Log in</Link>
            </p>
          </form>
        </section>
      </section>
    </div>
  );
}
