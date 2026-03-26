import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function CreativeNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    // Logo entrance
    gsap.fromTo(navRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.5 }
    );

    const handleScroll = () => {
      const y = window.scrollY;

      // Solid background after 50px
      setScrolled(y > 50);

      // Hide on scroll down, show on scroll up
      if (y > lastScrollY.current && y > 200) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = y;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navClass = [
    'c-nav',
    scrolled ? 'c-nav--solid' : '',
    hidden ? 'c-nav--hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <nav className={navClass} ref={navRef}>
      <Link to="/creative" className="c-nav__logo">
        The Making<span className="c-dot">.</span>Of
      </Link>

      <div className={`c-nav__links ${menuOpen ? 'is-open' : ''}`}>
        <a href="#c-stories" onClick={() => setMenuOpen(false)}>Stories</a>
        <a href="#c-topics" onClick={() => setMenuOpen(false)}>Topics</a>
        <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
        <Link to="/" onClick={() => setMenuOpen(false)}>Classic</Link>
        <Link to="/login" className="c-nav__cta" onClick={() => setMenuOpen(false)}>
          Log In
        </Link>
      </div>

      <button
        className="c-nav__burger"
        onClick={() => setMenuOpen(o => !o)}
        aria-label="menu"
      >
        <span className={menuOpen ? 'open' : ''} />
        <span className={menuOpen ? 'open' : ''} />
        <span className={menuOpen ? 'open' : ''} />
      </button>
    </nav>
  );
}
