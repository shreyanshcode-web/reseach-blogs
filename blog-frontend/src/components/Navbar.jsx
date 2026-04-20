import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import "../styles.css";
import { apiRequest, clearAuthToken, getAuthToken, setAuthToken } from "../lib/api";
import { useTheme } from "../lib/theme";

export default function Navbar({ alwaysSolid = false }) {
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(alwaysSolid);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const homeHref = currentUser || getAuthToken() ? "/home" : "/auth/login";

  useEffect(() => {
    if (alwaysSolid) return;
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, [alwaysSolid]);

  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setCurrentUser(null);
      return;
    }

    (async () => {
      try {
        let token = getAuthToken();
        if (isSignedIn) {
          token = (await getToken()) || token;
        }
        if (token) {
          setAuthToken(token);
        }
        const data = await apiRequest("/api/users/me");
        setCurrentUser(data);
      } catch {
        clearAuthToken();
        setCurrentUser(null);
      }
    })();
  }, [getToken, isLoaded, isSignedIn]);

  async function handleLogout() {
    clearAuthToken();
    setCurrentUser(null);
    setMenuOpen(false);
    await signOut();
    window.location.href = "/";
  }

  return (
    <nav className={scrolled ? "nav nav--solid" : "nav"}>
      <Link to={homeHref} className="logo">The Making<span>.</span>Of</Link>
      <div className={menuOpen ? "nav-links open" : "nav-links"}>
        <Link to={homeHref} onClick={() => setMenuOpen(false)}>Home</Link>
        <Link to="/search" onClick={() => setMenuOpen(false)}>Search</Link>
        <Link to="/dashboard/posts" onClick={() => setMenuOpen(false)}>Dashboard</Link>
        <Link to="/editor" onClick={() => setMenuOpen(false)}>Write</Link>
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
          <Link to="/auth/login" className="nav-cta" onClick={() => setMenuOpen(false)}>Log In</Link>
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
