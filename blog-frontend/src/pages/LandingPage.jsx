import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import { Ticker, LatestStories, Manifesto, MakingOf, Topics } from "../components/LandingSections";
import Footer from "../components/Footer";
import "../styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8001";

export default function LandingPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/posts/?limit=9`)
      .then(r => r.json()).then(d => setPosts(Array.isArray(d) ? d : [])).catch(() => { });
  }, []);

  return (
    <div className="site">
      <Navbar />
      <Hero />
      <Ticker />
      <LatestStories posts={posts} />
      <Manifesto />
      <MakingOf posts={posts} />
      <Topics />
      <Footer />
    </div>
  );
}
