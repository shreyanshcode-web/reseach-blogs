import { Link } from "react-router-dom";
import "../styles.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="logo" style={{ color: "#fff" }}>The Making<span style={{ color: "#e8001d" }}>.</span>Of</Link>
          <p className="footer-desc">A blog about ideas that matter.</p>
        </div>
        <div className="footer-cols">
          <div>
            <p className="fcol-head">Navigate</p>
            <a href="#stories">Stories</a><a href="#topics">Topics</a><Link to="/dashboard">Dashboard</Link>
          </div>
          <div>
            <p className="fcol-head">Connect</p>
            <a href="#">Twitter</a><a href="#">GitHub</a><a href="#">RSS</a>
          </div>
          <div>
            <p className="fcol-head">Legal</p>
            <a href="#">Privacy</a><a href="#">Terms</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2024 The Making Of. All rights reserved.</p>
        <Link to="/create-post" className="btn btn--sm">Write a story</Link>
      </div>
    </footer>
  );
}
