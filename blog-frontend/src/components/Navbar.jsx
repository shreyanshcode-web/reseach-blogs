import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles.css";
import { apiRequest, clearAuthToken, getAuthToken } from "../lib/api";
import { useTheme } from "../lib/theme";

export default function Navbar({ alwaysSolid = false }) {
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(alwaysSolid);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (alwaysSolid) return;
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, [alwaysSolid]);

  useEffect(() => {
    if (!getAuthToken()) {
      return;
    }

    apiRequest("/api/users/me")
      .then(setCurrentUser)
      .catch(() => {
        clearAuthToken();
        setCurrentUser(null);
      });
  }, []);

  function handleLogout() {
    clearAuthToken();
    setCurrentUser(null);
    setMenuOpen(false);
    window.location.href = "/";
  }

  return (
    <nav className={scrolled ? "nav nav--solid" : "nav"}>
      <Link to="/" className="logo">The Making<span>.</span>Of</Link>
      <div className={menuOpen ? "nav-links open" : "nav-links"}>
        <a href="/#stories" onClick={() => setMenuOpen(false)}>Stories</a>
        <a href="/#topics" onClick={() => setMenuOpen(false)}>Topics</a>
        <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
        <Link to="/create-post" onClick={() => setMenuOpen(false)}>Write</Link>
        <button type="button" className="theme-toggle" aria-label="Toggle theme" onClick={toggleTheme}>
          <span>{isDark ? "☀" : "☾"}</span>
        </button>
        {currentUser ? (
          <>
            <span style={{ fontSize: 12, color: "var(--gray)" }}>@{currentUser.username}</span>
            <button
              type="button"
              className="nav-cta"
              onClick={handleLogout}
              style={{ border: "none", cursor: "pointer" }}
            >
              Log Out
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-cta" onClick={() => setMenuOpen(false)}>Log In</Link>
        )}
      </div>
      <button className="burger" onClick={() => setMenuOpen(o => !o)} aria-label="menu">
        <span className={menuOpen ? "open" : ""} />
        <span className={menuOpen ? "open" : ""} />
        <span className={menuOpen ? "open" : ""} />
      </button>
    </nav>
  );
}
