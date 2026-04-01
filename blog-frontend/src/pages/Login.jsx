import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../auth.css";
import "../styles.css";
import { apiRequest, jsonBody, setAuthToken } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setMessage("");

    try {
      const data = await apiRequest("/api/users/login", {
        method: "POST",
        body: jsonBody({ email, password }),
      });

      setAuthToken(data.access_token);
      setStatus("success");
      setMessage("Logged in successfully. Redirecting to your home feed.");
      navigate("/home");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="site auth-page">
      <nav className="c-nav c-nav--solid">
        <Link to="/auth/login" className="c-nav__logo">The Making<span className="c-dot">.</span>Of</Link>
        <div className="c-nav__links">
          <Link to="/auth/login">Login</Link>
          <Link to="/auth/signup" className="c-nav__cta">Sign Up</Link>
        </div>
      </nav>

      <section className="auth-shell">
        <aside className="auth-hero">
          <div>
            <p className="auth-hero__kicker">Welcome Back</p>
            <h1>
              Log in to your
              <br />
              <em>writing orbit.</em>
            </h1>
          </div>

          <p>
            Jump straight into your feed, continue a draft, or manage your creator dashboard.
            The new auth flow now routes directly into the app shell instead of dropping you
            into disconnected pages.
          </p>

          <div className="auth-hero__meta">
            <div>
              <strong>/home</strong>
              <span>Main feed after login</span>
            </div>
            <div>
              <strong>/editor</strong>
              <span>Fullscreen writing flow</span>
            </div>
            <div>
              <strong>/dashboard</strong>
              <span>Creator management panel</span>
            </div>
          </div>
        </aside>

        <section className="auth-card">
          <div className="auth-card__header">
            <p className="eyebrow">Login</p>
            <h2>Access your account</h2>
            <p>Use the same email and password you registered with. Successful login redirects to `/home`.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </div>

            <button type="submit" className="btn auth-submit" disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? "Logging in..." : "Log In"}
            </button>

            {message ? (
              <div className={`auth-message ${status === "success" ? "auth-message--success" : "auth-message--error"}`}>
                {message}
              </div>
            ) : null}

            <p className="auth-switch">
              Don&apos;t have an account? <Link to="/auth/signup">Create one</Link>
            </p>
          </form>
        </section>
      </section>
    </div>
  );
}
