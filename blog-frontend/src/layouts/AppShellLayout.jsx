import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import "../app-shell.css";
import { apiRequest, clearAuthToken, getAuthToken } from "../lib/api";

const navLinkStyle = ({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  textDecoration: "none",
  color: isActive ? "var(--c-text)" : "var(--c-text-dim)",
  fontWeight: isActive ? 700 : 600,
  padding: "12px 16px",
  borderRadius: 18,
  background: isActive ? "rgba(232, 0, 29, 0.12)" : "transparent",
  border: isActive ? "1px solid rgba(232, 0, 29, 0.16)" : "1px solid transparent",
});

function RightRailCard({ title, children }) {
  return (
    <section style={{ padding: 22, borderRadius: 26, background: "var(--c-glass)", border: "1px solid var(--c-glass-border)", boxShadow: "0 16px 40px rgba(0,0,0,0.2)", backdropFilter: "blur(22px)" }}>
      <h3 style={{ fontFamily: 'var(--c-font-display)', fontSize: 24, marginBottom: 16, color: "var(--c-text)" }}>{title}</h3>
      {children}
    </section>
  );
}

export default function AppShellLayout() {
  const [currentUser, setCurrentUser] = useState(null);
  const [trending, setTrending] = useState([]);
  const [latest, setLatest] = useState([]);
  const token = getAuthToken();

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      return;
    }

    apiRequest("/api/users/me")
      .then(setCurrentUser)
      .catch(() => {
        clearAuthToken();
        setCurrentUser(null);
      });
  }, [token]);

  useEffect(() => {
    apiRequest("/api/analytics/weekly-top")
      .then((data) => setTrending(Array.isArray(data?.posts) ? data.posts.slice(0, 4) : []))
      .catch(() => setTrending([]));

    apiRequest("/api/posts/?limit=5")
      .then((data) => setLatest(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => setLatest([]));
  }, []);

  const profilePath = useMemo(() => (
    currentUser?.username ? `/profile/${currentUser.username}` : "/auth/login"
  ), [currentUser]);

  function handleLogout() {
    clearAuthToken();
    window.location.href = "/";
  }

  return (
    <div className="app-shell">
      <div className="app-shell__grid">
        <aside className="app-shell__left">
          <div style={{ padding: 22, borderRadius: 28, background: "var(--c-glass)", border: "1px solid var(--c-glass-border)", backdropFilter: "blur(22px)" }}>
            <Link to={token ? "/home" : "/"} className="c-nav__logo" style={{ display: "inline-block", marginBottom: 22 }}>The Making<span className="c-dot">.</span>Of</Link>
            <nav style={{ display: "grid", gap: 6 }}>
              <NavLink to="/home" style={navLinkStyle}>Home</NavLink>
              <NavLink to="/search" style={navLinkStyle}>Search</NavLink>
              <NavLink to="/editor" style={navLinkStyle}>Write</NavLink>
              <NavLink to={profilePath} style={navLinkStyle}>Profile</NavLink>
              <NavLink to="/dashboard" style={navLinkStyle}>Dashboard</NavLink>
              <NavLink to="/dashboard/settings" style={navLinkStyle}>Settings</NavLink>
            </nav>
            <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
              {token ? (
                <button type="button" className="btn btn--ghost" onClick={handleLogout}>Logout</button>
              ) : (
                <Link to="/auth/login" className="btn">Log In</Link>
              )}
            </div>
          </div>

          {currentUser ? (
            <div style={{ padding: 22, borderRadius: 28, background: "var(--c-glass)", border: "1px solid var(--c-glass-border)", backdropFilter: "blur(22px)" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "var(--c-text-dim)", marginBottom: 10 }}>Signed In</div>
              <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>@{currentUser.username}</div>
              <div style={{ color: "var(--c-text-dim)", lineHeight: 1.6 }}>Jump back into the feed, edit a story, or manage your creator dashboard.</div>
            </div>
          ) : null}
        </aside>

        <main className="app-shell__main">
          <Outlet />
        </main>

        <aside className="app-shell__right">
          <RightRailCard title="Trending">
            <div style={{ display: "grid", gap: 14 }}>
              {trending.length ? trending.map((post) => (
                <Link key={post.post_id} to={`/post/${post.post_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{post.title}</div>
                  <div style={{ color: "var(--c-text-dim)", fontSize: 14 }}>{post.likes} likes · {post.shares} shares</div>
                </Link>
              )) : <div style={{ color: "var(--c-text-dim)", lineHeight: 1.7 }}>Weekly top stories will appear here once engagement data starts flowing.</div>}
            </div>
          </RightRailCard>

          <RightRailCard title="Latest">
            <div style={{ display: "grid", gap: 14 }}>
              {latest.length ? latest.map((post) => (
                <Link key={post.id} to={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{post.title}</div>
                  <div style={{ color: "var(--c-text-dim)", fontSize: 14 }}>by {post.author?.username || "writer"}</div>
                </Link>
              )) : <div style={{ color: "var(--c-text-dim)" }}>Fresh stories will load here.</div>}
            </div>
          </RightRailCard>
        </aside>
      </div>
    </div>
  );
}
