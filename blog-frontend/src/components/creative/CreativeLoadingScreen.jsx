import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function CreativeLoadingScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const loaderRef = useRef(null);
  const barRef = useRef(null);
  const counterRef = useRef(null);
  const brandRef = useRef(null);

  useEffect(() => {
    const loader = loaderRef.current;
    const bar = barRef.current;
    const counter = counterRef.current;
    const brand = brandRef.current;
    if (!loader || !bar || !counter || !brand) return;

    const tl = gsap.timeline();

    // Brand name entrance — stagger each character
    const brandChars = brand.querySelectorAll('span');
    tl.fromTo(brandChars,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.05,
        ease: 'power3.out',
      }
    );

    // Progress bar fill
    const counterObj = { val: 0 };
    tl.to(bar, {
      width: '100%',
      duration: 1.8,
      ease: 'power2.inOut',
    }, '-=0.3');

    tl.to(counterObj, {
      val: 100,
      duration: 1.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        counter.textContent = String(Math.round(counterObj.val)).padStart(3, '0');
      },
    }, '<');

    // Exit animation
    tl.to(loader, {
      opacity: 0,
      scale: 1.05,
      duration: 0.8,
      ease: 'power2.inOut',
      delay: 0.3,
      onComplete: () => {
        setIsVisible(false);
        if (onComplete) onComplete();
      },
    });

    return () => tl.kill();
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="c-loader" ref={loaderRef}>
      <div className="c-loader__brand" ref={brandRef}>
        <span>T</span><span>h</span><span>e</span>
        <span>&nbsp;</span>
        <span>M</span><span>a</span><span>k</span><span>i</span><span>n</span><span>g</span>
        <span className="c-accent-dot">.</span>
        <span>O</span><span>f</span>
      </div>
      <div className="c-loader__bar-track">
        <div className="c-loader__bar-fill" ref={barRef} />
      </div>
      <div className="c-loader__counter" ref={counterRef}>000</div>
    </div>
  );
}
