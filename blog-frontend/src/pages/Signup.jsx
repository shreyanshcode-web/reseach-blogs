import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignUp, useAuth } from "@clerk/clerk-react";
import { motion } from "framer-motion";

import "../auth.css";
import "../styles.css";
import { setAuthToken } from "../lib/api";
import Navbar from "../components/Navbar";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { y: 25, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 90, damping: 18 },
  },
};

const rightPanelVariants = {
  hidden: { scale: 0.96, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 80, damping: 20, delay: 0.35 },
  },
};

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
      {/* Reused homepage navbar */}
      <Navbar />

      <section className="auth-shell">
        {/* Storytelling left panel */}
        <motion.aside
          className="auth-hero"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <p className="auth-hero__kicker">Join Us</p>
          </motion.div>

          <motion.h1 variants={itemVariants}>
            Start your
            <br />
            <em>creator path.</em>
          </motion.h1>

          <motion.p className="auth-hero__desc" variants={itemVariants}>
            Sign up once, get logged in immediately, and land in the editor so the first thing
            you can do is write. Clerk now manages your authentication securely and the app
            keeps your session synced.
          </motion.p>

          {/* Three floating feature cards - Horizontal row */}
          <motion.div className="auth-hero__meta" variants={containerVariants}>
            <motion.a 
              href="/home" 
              className="auth-hero__meta-card" 
              variants={cardVariants}
              whileHover={{ y: -5 }}
              onClick={(e) => { e.preventDefault(); navigate("/home"); }}
            >
              <div className="auth-card-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <strong>/home</strong>
              <span>Main feed after login</span>
            </motion.a>

            <motion.a 
              href="/editor" 
              className="auth-hero__meta-card" 
              variants={cardVariants}
              whileHover={{ y: -5 }}
              onClick={(e) => { e.preventDefault(); navigate("/editor"); }}
            >
              <div className="auth-card-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 20.013a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
              </div>
              <strong>/editor</strong>
              <span>Fullscreen writing flow</span>
            </motion.a>

            <motion.a 
              href="/dashboard" 
              className="auth-hero__meta-card" 
              variants={cardVariants}
              whileHover={{ y: -5 }}
              onClick={(e) => { e.preventDefault(); navigate("/dashboard"); }}
            >
              <div className="auth-card-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1-3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
              </div>
              <strong>/dashboard</strong>
              <span>Creator management</span>
            </motion.a>
          </motion.div>
        </motion.aside>

        {/* Right authentication panel (dark glass card) */}
        <motion.section
          className="auth-card"
          variants={rightPanelVariants}
          initial="hidden"
          animate="visible"
        >
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
        </motion.section>
      </section>
    </div>
  );
}
