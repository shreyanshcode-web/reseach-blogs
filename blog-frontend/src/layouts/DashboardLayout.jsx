import { NavLink, Outlet } from "react-router-dom";

import "../app-shell.css";

function tabClassName({ isActive }) {
  return `app-shell__dashboard-tab${isActive ? " active" : ""}`;
}

export default function DashboardLayout() {
  return (
    <div className="app-shell__dashboard-frame">
      <section className="app-shell__hero-strip">
        <div className="app-shell__hero-card">
          <div className="app-shell__glow app-shell__glow--one" />
          <div className="app-shell__glow app-shell__glow--two" />
          <div style={{ position: "relative", zIndex: 1 }}>
            <p className="app-shell__eyebrow">Creator Console</p>
            <h1 className="app-shell__headline">Dashboard built in the same creative system.</h1>
            <p className="app-shell__copy">
              Posts, drafts, settings, and performance now live inside the same widescreen glass-stage language as the landing experience,
              so the product reads like one continuous app.
            </p>
            <nav className="app-shell__dashboard-tabs">
              <NavLink end to="/dashboard/posts" className={tabClassName}>
                Posts
              </NavLink>
              <NavLink to="/dashboard/drafts" className={tabClassName}>
                Drafts
              </NavLink>
              <NavLink to="/dashboard/settings" className={tabClassName}>
                Settings
              </NavLink>
            </nav>
          </div>
        </div>

        <aside className="app-shell__side-card">
          <p className="app-shell__eyebrow">Workspace Notes</p>
          <div className="app-shell__mini-list">
            <div className="app-shell__mini-block">
              <div className="app-shell__mini-title">16:9 framing</div>
              <div className="app-shell__mini-copy">The dashboard now uses widescreen stage panels instead of narrow center cards.</div>
            </div>
            <div className="app-shell__mini-block">
              <div className="app-shell__mini-title">No side dead zones</div>
              <div className="app-shell__mini-copy">Content stretches edge to edge with only minimal device-safe padding.</div>
            </div>
            <div className="app-shell__mini-block">
              <div className="app-shell__mini-title">Shared creative identity</div>
              <div className="app-shell__mini-copy">All creator pages now sit inside the same cinematic shell.</div>
            </div>
          </div>
        </aside>
      </section>

      <Outlet />
    </div>
  );
}
