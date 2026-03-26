import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    // Hide on mobile / touch
    if (window.matchMedia('(max-width: 768px)').matches) return;

    const cursor = cursorRef.current;
    const dot = dotRef.current;
    const circle = circleRef.current;
    if (!cursor || !dot || !circle) return;

    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Dot follows instantly
      gsap.to(dot, { x: mouseX, y: mouseY, duration: 0.1, ease: 'power2.out' });
      // Circle follows with lag
      gsap.to(circle, { x: mouseX, y: mouseY, duration: 0.35, ease: 'power2.out' });
    };

    const interactiveElements = 'a, button, [data-cursor-hover], .c-card, .c-making-card, .c-hero-card, .c-topic-row';

    const onEnter = () => cursor.classList.add('is-hovering');
    const onLeave = () => cursor.classList.remove('is-hovering');

    // Attach listeners
    document.addEventListener('mousemove', onMouseMove);

    const elements = document.querySelectorAll(interactiveElements);
    elements.forEach(el => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    // MutationObserver to catch dynamically added elements
    const observer = new MutationObserver(() => {
      const newElements = document.querySelectorAll(interactiveElements);
      newElements.forEach(el => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      elements.forEach(el => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
      observer.disconnect();
    };
  }, []);

  return (
    <div className="c-cursor" ref={cursorRef}>
      <div className="c-cursor__dot" ref={dotRef} />
      <div className="c-cursor__circle" ref={circleRef} />
    </div>
  );
}
