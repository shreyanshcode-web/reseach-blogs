import { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroScene from './HeroScene';

gsap.registerPlugin(ScrollTrigger);

export default function CreativeHero({ inView }) {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const titleRef = useRef(null);
  const subRef = useRef(null);
  const ctaRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Entrance timeline
      const tl = gsap.timeline({ delay: 0.3 });

      tl.fromTo(eyebrowRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      )
      .fromTo(titleRef.current.children,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1 },
        '-=0.4'
      )
      .fromTo(subRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
        '-=0.5'
      )
      .fromTo(ctaRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
        '-=0.3'
      )
      .fromTo(scrollRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: 'power2.out' },
        '-=0.2'
      );

      // Scroll-driven parallax on hero content
      gsap.to(titleRef.current, {
        y: -80,
        opacity: 0.3,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      gsap.to(subRef.current, {
        y: -40,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: '20% top',
          end: '80% top',
          scrub: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="c-hero" ref={sectionRef}>
      {/* WebGL 3D Canvas */}
      <div className="c-hero__canvas">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 60 }}
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <HeroScene inView={inView} />
        </Canvas>
      </div>

      {/* Gradient overlay */}
      <div className="c-hero__overlay" />

      {/* Content */}
      <div className="c-hero__content">
        <p className="c-hero__eyebrow" ref={eyebrowRef}>
          <span>A blog about ideas that matter</span>
        </p>

        <h1 className="c-hero__title" ref={titleRef}>
          <span style={{ display: 'block' }}>We are</span>
          <span style={{ display: 'block' }}><em>decoding</em></span>
          <span style={{ display: 'block' }}>meanings.</span>
        </h1>

        <p className="c-hero__sub" ref={subRef}>
          Stories, essays, and deep dives at the intersection of
          technology, culture, and human experience.
        </p>

        <div ref={ctaRef}>
          <a href="#c-stories" className="c-hero__cta">
            Read the stories
            <span>→</span>
          </a>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="c-hero__scroll" ref={scrollRef}>
        <span>Scroll</span>
        <div className="c-hero__scroll-line" />
      </div>
    </section>
  );
}
