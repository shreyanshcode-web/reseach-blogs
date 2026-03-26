import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function TextReveal({
  children,
  as: Tag = 'div',
  className = '',
  stagger = 0.03,
  duration = 0.8,
  triggerStart = 'top 85%',
  once = true,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Split text into words and characters
    const text = el.textContent;
    el.innerHTML = '';

    const words = text.split(' ');
    const chars = [];

    words.forEach((word, wIdx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'c-text-reveal__word';

      [...word].forEach((char) => {
        const charSpan = document.createElement('span');
        charSpan.className = 'c-text-reveal__char';
        charSpan.textContent = char;
        wordSpan.appendChild(charSpan);
        chars.push(charSpan);
      });

      el.appendChild(wordSpan);

      // Add space between words (except last)
      if (wIdx < words.length - 1) {
        const space = document.createElement('span');
        space.className = 'c-text-reveal__word';
        space.innerHTML = '&nbsp;';
        el.appendChild(space);
      }
    });

    // GSAP animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: triggerStart,
        toggleActions: once ? 'play none none none' : 'play none none reverse',
      },
    });

    tl.to(chars, {
      y: 0,
      opacity: 1,
      duration,
      stagger,
      ease: 'power3.out',
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [children, stagger, duration, triggerStart, once]);

  return (
    <Tag ref={containerRef} className={`c-text-reveal ${className}`}>
      {children}
    </Tag>
  );
}
