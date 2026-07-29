import { useState, useEffect } from "react";
import Lenis from "lenis";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import { Ticker, LatestStories, Manifesto, MakingOf, Topics } from "../components/LandingSections";
import Footer from "../components/Footer";
import LoadingScreen from "../components/LoadingScreen";
import "../styles.css";
import { apiRequest } from "../lib/api";
import { normalizePosts } from "../lib/posts";

export default function LandingPage() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.08,
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    let frameId;

    function raf(time) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    apiRequest("/api/posts/?limit=9")
      .then((data) =>
        setPosts(
          normalizePosts(data).map((post) => ({
            ...post,
            content: post.excerpt,
          })),
        ),
      )
      .catch(() => { })
      .finally(() => setIsLoading(false));

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      <div className="site" style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.8s ease' }}>
        <Navbar />
        <Hero />
        <Ticker />
        <LatestStories posts={posts} />
        <Manifesto />
        <MakingOf posts={posts} />
        <Topics />
        <Footer />
      </div>
    </>
  );
}
