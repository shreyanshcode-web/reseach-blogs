import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignUp, useAuth } from "@clerk/clerk-react";

import "../auth.css";
import "../styles.css";
import { setAuthToken } from "../lib/api";

export default function Signup() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    (async () => {
      try {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
        navigate("/editor");
      } catch {
        // ignore token fetch failure; Clerk will still manage the session
      }
    })();
  }, [getToken, isLoaded, isSignedIn, navigate]);

  return (
    <div className="site auth-page">
      <nav className="c-nav c-nav--solid">
        <Link to="/auth/login" className="c-nav__logo">The Making<span className="c-dot">.</span>Of</Link>
        <div className="c-nav__links">
          <Link to="/auth/login">Login</Link>
          <Link to="/auth/login" className="c-nav__cta">Log In</Link>
        </div>
      </nav>

      <section className="auth-shell">
        <aside className="auth-hero">
          <div>
            <p className="auth-hero__kicker">Join Us</p>
            <h1>
              Start your
              <br />
              <em>creator path.</em>
            </h1>
          </div>

          <p>
            Sign up once, get logged in immediately, and land in the editor so the first thing
            you can do is write. Clerk now manages your authentication securely and the app
            keeps your session synced.
          </p>

          <div className="auth-hero__meta">
            <div>
              <strong>Auto login</strong>
              <span>No second step after signup</span>
            </div>
            <div>
              <strong>Secure auth</strong>
              <span>Clerk handles password flow</span>
            </div>
            <div>
              <strong>Redirect</strong>
              <span>Go straight to `/editor`</span>
            </div>
          </div>
        </aside>

        <section className="auth-card">
          <div className="auth-card__header">
            <p className="eyebrow">Signup</p>
            <h2>Create your account</h2>
            <p>Clerk securely creates your account and sends you into the editor right away.</p>
          </div>

          <div className="auth-form" style={{ minWidth: 320 }}>
            <SignUp
              path="/auth/signup"
              routing="path"
              signInUrl="/auth/login"
              afterSignUpUrl="/editor"
            />
          </div>

          <p className="auth-switch">
            Already have an account? <Link to="/auth/login">Log in</Link>
          </p>
        </section>
      </section>
    </div>
  );
}
