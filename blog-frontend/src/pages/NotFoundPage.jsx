import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "40px 5vw", background: "linear-gradient(180deg, #fff8f6 0%, #ffffff 60%, #f7fafc 100%)" }}>
      <section style={{ maxWidth: 760, width: "100%", textAlign: "center", padding: "44px 32px", borderRadius: 34, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(15,23,42,0.08)" }}>
        <p className="eyebrow">404</p>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: "clamp(44px, 8vw, 92px)", lineHeight: 0.92, marginBottom: 18 }}>This page wandered off.</h1>
        <p style={{ color: "var(--gray)", lineHeight: 1.8, maxWidth: 620, margin: "0 auto 24px" }}>
          The route exists in your app map now, but this specific URL does not. Head back to the landing page or jump straight into the feed.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link to="/" className="btn">Go Home</Link>
          <Link to="/home" className="btn btn--ghost">Open Feed</Link>
        </div>
      </section>
    </div>
  );
}
