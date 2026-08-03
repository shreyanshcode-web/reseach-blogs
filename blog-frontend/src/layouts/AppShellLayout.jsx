import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

import "../app-shell.css";
import { apiRequest, clearAuthToken, getAuthToken, setAuthToken } from "../lib/api";

function navClassName({ isActive }) {
  return `app-shell__navlink${isActive ? " is-active" : ""}`;
}

export default function AppShellLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === "/home";
  const [currentUser, setCurrentUser] = useState(null);
  const [trending, setTrending] = useState([]);
  const [latest, setLatest] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const hasAuthToken = Boolean(getAuthToken());

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      clearAuthToken();
      setCurrentUser(null);
      return;
    }

    (async () => {
      try {
        const token = await getToken();
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

  useEffect(() => {
    apiRequest("/api/analytics/weekly-top")
      .then((data) => setTrending(Array.isArray(data?.posts) ? data.posts.slice(0, 3) : []))
      .catch(() => setTrending([]));

    apiRequest("/api/posts/?limit=4")
      .then((data) => setLatest(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => setLatest([]));
  }, []);

  const profilePath = useMemo(
    () => (currentUser?.username ? `/profile/${currentUser.username}` : "/auth/login"),
    [currentUser],
  );

  async function handleLogout() {
    clearAuthToken();
    await signOut();
    window.location.href = "/";
  }

  return (
    <div className="app-shell">
      <header className="app-shell__topbar">
        <div className="app-shell__topbar-inner">
          <Link to={isSignedIn || hasAuthToken ? "/home" : "/auth/login"} className="c-nav__logo" onClick={() => setMenuOpen(false)}>
            The Making<span className="c-dot">.</span>Of
          </Link>

          <div className={`app-shell__menu-wrapper${menuOpen ? " is-open" : ""}`}>
            <nav className="app-shell__nav">
              <NavLink to="/home" className={navClassName} onClick={() => setMenuOpen(false)}>
                Home
              </NavLink>
              <NavLink to="/search" className={navClassName} onClick={() => setMenuOpen(false)}>
                Search
              </NavLink>
              <NavLink to="/editor" className={navClassName} onClick={() => setMenuOpen(false)}>
                Write
              </NavLink>
              <NavLink to={profilePath} className={navClassName} onClick={() => setMenuOpen(false)}>
                Profile
              </NavLink>
              <NavLink to="/dashboard/posts" className={navClassName} onClick={() => setMenuOpen(false)}>
                Dashboard
              </NavLink>
            </nav>

            <div className="app-shell__actions">
              {isSignedIn || hasAuthToken ? (
                <>
                  <Link to="/dashboard/settings" className="app-shell__button" onClick={() => setMenuOpen(false)}>
                    Settings
                  </Link>
                  <button type="button" className="app-shell__button app-shell__button--primary" onClick={() => { setMenuOpen(false); handleLogout(); }}>
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/auth/login" className="app-shell__button app-shell__button--primary" onClick={() => setMenuOpen(false)}>
                  Log In
                </Link>
              )}
            </div>
          </div>

          <button className="burger" onClick={() => setMenuOpen(o => !o)} aria-label="menu">
            <span className={menuOpen ? "open" : ""} />
            <span className={menuOpen ? "open" : ""} />
            <span className={menuOpen ? "open" : ""} />
          </button>
        </div>
      </header>

      <div className="app-shell__content">
        {isHomePage ? (
          <>
            <section className="app-shell__hero-strip">
              <div className="app-shell__hero-card">
                <div className="app-shell__glow app-shell__glow--one" />
                <div className="app-shell__glow app-shell__glow--two" />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <p className="app-shell__eyebrow">Creative System</p>
                  <h1 className="app-shell__headline">
                    One visual language for the full reading product.
                  </h1>
                  <p className="app-shell__copy">
                    The app shell now uses the same dark cinematic direction as the creative landing page, with full-width framing,
                    16:9 hero panels, and no wasted left or right columns.
                  </p>
                  <div className="app-shell__meta">
                    <span className="app-shell__tag">{isSignedIn || hasAuthToken ? `@${currentUser?.username || "creator"}` : "Guest session"}</span>
                    <span className="app-shell__tag">{trending.length} trending signals</span>
                    <span className="app-shell__tag">{latest.length} fresh stories loaded</span>
                  </div>
                </div>
              </div>

              <aside className="app-shell__side-card">
                <p className="app-shell__eyebrow">Now Moving</p>
                <div className="app-shell__mini-list">
                  {trending.length ? (
                    trending.map((post) => (
                      <Link key={post.post_id} to={`/post/${post.post_id}`} className="app-shell__mini-link">
                        <div className="app-shell__mini-title">{post.title}</div>
                        <div className="app-shell__mini-copy">
                          {post.likes} likes · {post.shares} shares
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="app-shell__mini-block">
                      <div className="app-shell__mini-title">Trending stories will appear here.</div>
                      <div className="app-shell__mini-copy">
                        Once engagement starts flowing, this strip turns into your live signal board.
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </section>

            <section className="app-shell__body-grid">
              <main className="app-shell__stack">
                <Outlet />
              </main>

              <aside className="app-shell__stack">
                <section className="app-shell__stage-card">
                  <p className="app-shell__eyebrow">Fresh Drops</p>
                  <div className="app-shell__mini-list">
                    {latest.length ? (
                      latest.map((post) => (
                        <Link key={post.id} to={`/post/${post.id}`} className="app-shell__mini-link">
                          <div className="app-shell__mini-title">{post.title}</div>
                          <div className="app-shell__mini-copy">by {post.author?.username || "writer"}</div>
                        </Link>
                      ))
                    ) : (
                      <div className="app-shell__empty">Fresh stories will load here when new pieces are published.</div>
                    )}
                  </div>
                </section>

                <section className="app-shell__stage-card">
                  <p className="app-shell__eyebrow">Workspace</p>
                  <div className="app-shell__mini-list">
                    <Link to="/editor" className="app-shell__mini-link">
                      <div className="app-shell__mini-title">Write a new story</div>
                      <div className="app-shell__mini-copy">Jump straight into the editor from the same creative frame.</div>
                    </Link>
                    <Link to="/dashboard/posts" className="app-shell__mini-link">
                      <div className="app-shell__mini-title">Open creator dashboard</div>
                      <div className="app-shell__mini-copy">Review analytics, reach, drafts, and profile performance.</div>
                    </Link>
                    <Link to={profilePath} className="app-shell__mini-link">
                      <div className="app-shell__mini-title">View public profile</div>
                      <div className="app-shell__mini-copy">See how your page reads in the same product style your audience sees.</div>
                    </Link>
                  </div>
                </section>
              </aside>
            </section>
          </>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
