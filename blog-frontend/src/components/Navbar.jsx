import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles.css";

export default function Navbar({ alwaysSolid = false }) {
  const [scrolled, setScrolled] = useState(alwaysSolid);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (alwaysSolid) return;
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, [alwaysSolid]);

  return (
    <nav className={scrolled ? "nav nav--solid" : "nav"}>
      <Link to="/" className="logo">The Making<span>.</span>Of</Link>
      <div className={menuOpen ? "nav-links open" : "nav-links"}>
        <a href="/#stories" onClick={() => setMenuOpen(false)}>Stories</a>
        <a href="/#topics" onClick={() => setMenuOpen(false)}>Topics</a>
        <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
        <Link to="/hero" onClick={() => setMenuOpen(false)}>Hero</Link>
        <Link to="/login" className="nav-cta" onClick={() => setMenuOpen(false)}>Log In</Link>
      </div>
      <button className="burger" onClick={() => setMenuOpen(o => !o)} aria-label="menu">
        <span className={menuOpen ? "open" : ""} />
        <span className={menuOpen ? "open" : ""} />
        <span className={menuOpen ? "open" : ""} />
      </button>
    </nav>
  );
}
