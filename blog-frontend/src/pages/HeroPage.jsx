import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import "../styles.css";

export default function HeroPage() {
  return (
    <div className="site">
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
}
