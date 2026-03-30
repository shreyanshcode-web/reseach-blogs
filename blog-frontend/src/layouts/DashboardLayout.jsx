import { NavLink, Outlet } from "react-router-dom";

const tabStyle = ({ isActive }) => ({
  textDecoration: "none",
  padding: "12px 18px",
  borderRadius: 999,
  background: isActive ? "rgba(232, 0, 29, 0.16)" : "var(--c-glass)",
  color: "var(--c-text)",
  border: isActive ? "1px solid rgba(232, 0, 29, 0.26)" : "1px solid var(--c-glass-border)",
  fontWeight: 700,
});

export default function DashboardLayout() {
  return (
    <div className="c-page" style={{ minHeight: "100vh", background: "linear-gradient(180deg, var(--c-bg) 0%, var(--c-bg-alt) 55%, var(--c-bg) 100%)", padding: "88px 0 64px" }}>
      <div style={{ width: "min(1240px, 94vw)", margin: "0 auto" }}>
        <header style={{ marginBottom: 22 }}>
          <p className="c-section__label">Creator Panel</p>
          <h1 style={{ fontFamily: 'var(--c-font-display)', fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.95, marginBottom: 14, color: "var(--c-text)" }}>Dashboard</h1>
          <p style={{ maxWidth: 760, color: "var(--c-text-dim)", lineHeight: 1.7 }}>
            Manage published work, drafts, profile settings, and performance from one dedicated creator workspace.
          </p>
        </header>

        <nav style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 26 }}>
          <NavLink end to="/dashboard/posts" style={tabStyle}>Posts</NavLink>
          <NavLink to="/dashboard/drafts" style={tabStyle}>Drafts</NavLink>
          <NavLink to="/dashboard/settings" style={tabStyle}>Settings</NavLink>
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
