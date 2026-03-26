import { useRef, useEffect } from 'react';
import gsap from 'gsap';

export default function CreativeAlert() {
  const alertRef = useRef(null);

  useEffect(() => {
    const el = alertRef.current;
    if (!el) return;

    // Entrance animation
    gsap.fromTo(el,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 1.5 }
    );
  }, []);

  return (
    <div className="c-alert" ref={alertRef}>
      <div className="c-alert__icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 18H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10.29 3.86L1.82 18C1.64531 18.3024 1.55299 18.6452 1.55299 19.0016C1.55299 19.3581 1.64531 19.7008 1.82 20.0032C1.99469 20.3056 2.24647 20.5574 2.54889 20.7321C2.85131 20.9068 3.19409 20.9991 3.55057 20.9991H20.4494C20.8059 20.9991 21.1487 20.9068 21.4511 20.7321C21.7535 20.5574 22.0053 20.3056 22.18 20.0032C22.3547 19.7008 22.447 19.3581 22.447 19.0016C22.447 18.6452 22.3547 18.3024 22.18 18L13.71 3.86C13.5358 3.55629 13.284 3.30312 12.9814 3.12716C12.6788 2.9512 12.3361 2.8584 11.9871 2.8584C11.638 2.8584 11.2954 2.9512 10.9928 3.12716C10.6902 3.30312 10.4383 3.55629 10.2642 3.86H10.29Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="c-alert__content">
        <p className="c-alert__title">Medical Assistance Notice</p>
        <p className="c-alert__text">
          International travelers and domestic tourists from other states who fall ill in unfamiliar cities don't know which hospitals or clinics to visit, whether doctors speak their language, or what treatment costs to expect, and they need dedicated tourist medical assistance helplines connecting them with verified English-speaking healthcare providers.
        </p>
      </div>
      <button className="c-alert__close" onClick={() => gsap.to(alertRef.current, { y: -100, opacity: 0, duration: 0.5, ease: 'power2.in' })}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
