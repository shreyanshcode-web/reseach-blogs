import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import "../styles.css";

export default function Dashboard() {
  return (
    <div className="site" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar alwaysSolid={true} />
      
      <main style={{ flex: 1, paddingTop: 120, paddingBottom: 80, paddingLeft: "8%", paddingRight: "8%" }}>
        <motion.p className="eyebrow"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          Dashboard
        </motion.p>
        <motion.h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, marginBottom: 48 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}>
          Welcome back to<br />your <em style={{ color: 'var(--red)' }}>workspace</em>.
        </motion.h1>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32 }}>
          
          <div className="card" style={{ padding: 40, border: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
            <h3 className="card-title">My Stories</h3>
            <p className="card-excerpt">You have 3 published stories and 1 draft.</p>
            <a href="/create-post" className="btn btn--sm">Write new</a>
          </div>

          <div className="card" style={{ padding: 40, border: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
            <h3 className="card-title">Analytics</h3>
            <p className="card-excerpt">Your stories have reached 1.2k readers this month.</p>
            <span className="read-more">View stats &rarr;</span>
          </div>
          
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
