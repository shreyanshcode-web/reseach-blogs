import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ParallaxImage({ children, speed = 0.3, className = '' }) {
  const containerRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    // Entrance reveal animation
    gsap.fromTo(inner,
      { scale: 1.15, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 1.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      }
    );

    // Parallax movement
    gsap.to(inner, {
      yPercent: -speed * 30,
      ease: 'none',
      scrollTrigger: {
        trigger: container,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === container) st.kill();
      });
    };
  }, [speed]);

  return (
    <div ref={containerRef} className={`c-parallax ${className}`}>
      <div ref={innerRef} className="c-parallax__inner">
        {children}
      </div>
    </div>
  );
}
