import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function CreativeFooter() {
  const footerRef = useRef(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(footer.children,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.12,
          scrollTrigger: {
            trigger: footer,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, footer);

    return () => ctx.revert();
  }, []);

  return (
    <footer className="c-footer" ref={footerRef}>
      <div className="c-footer__inner">
        <div className="c-footer__brand">
          <Link to="/" className="c-nav__logo">
            The Making<span className="c-dot">.</span>Of
          </Link>
          <p className="c-footer__desc">
            A blog about ideas that matter. Stories at the intersection
            of technology, culture, and human experience.
          </p>
        </div>
        <div className="c-footer__cols">
          <div>
            <p className="c-footer__col-head">Navigate</p>
            <a href="#c-stories">Stories</a>
            <a href="#c-topics">Topics</a>
            <Link to="/dashboard">Dashboard</Link>
          </div>
          <div>
            <p className="c-footer__col-head">Connect</p>
            <a href="#">Twitter</a>
            <a href="#">GitHub</a>
            <a href="#">RSS</a>
          </div>
          <div>
            <p className="c-footer__col-head">Legal</p>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
      <div className="c-footer__bottom">
        <p>&copy; 2024 The Making Of. All rights reserved.</p>
        <Link to="/editor" className="c-footer__write-btn">
          Write a story →
        </Link>
      </div>
    </footer>
  );
}
