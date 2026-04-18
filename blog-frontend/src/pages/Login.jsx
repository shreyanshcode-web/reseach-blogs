import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/clerk-react";

import "../auth.css";
import "../styles.css";
import { setAuthToken } from "../lib/api";

export default function Login() {
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
        navigate("/home");
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
          <Link to="/auth/signup" className="c-nav__cta">Sign Up</Link>
        </div>
      </nav>

      <section className="auth-shell">
        <aside className="auth-hero">
          <div>
            <p className="auth-hero__kicker">Welcome Back</p>
            <h1>
              Log in to your
              <br />
              <em>writing orbit.</em>
            </h1>
          </div>

          <p>
            Jump straight into your feed, continue a draft, or manage your creator dashboard.
            Clerk now securely handles login and token issuance, while the app keeps your session synced.
          </p>

          <div className="auth-hero__meta">
            <div>
              <strong>/home</strong>
              <span>Main feed after login</span>
            </div>
            <div>
              <strong>/editor</strong>
              <span>Fullscreen writing flow</span>
            </div>
            <div>
              <strong>/dashboard</strong>
              <span>Creator management panel</span>
            </div>
          </div>
        </aside>

        <section className="auth-card">
          <div className="auth-card__header">
            <p className="eyebrow">Login</p>
            <h2>Access your account</h2>
            <p>Clerk handles sign-in securely and routes you into the blog experience.</p>
          </div>

          <div className="auth-form" style={{ minWidth: 320 }}>
            <SignIn
              path="/auth/login"
              routing="path"
              signUpUrl="/auth/signup"
              afterSignInUrl="/home"
            />
          </div>

          <p className="auth-switch">
            Don&apos;t have an account? <Link to="/auth/signup">Create one</Link>
          </p>
        </section>
      </section>
    </div>
  );
}
