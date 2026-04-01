import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import PixelBat from "./PixelBat";

const TRANSITION_MS = 520;

export default function RouteTransitionLoader({ children }) {
  const location = useLocation();
  const firstRender = useRef(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setIsTransitioning(true);
    const timer = window.setTimeout(() => setIsTransitioning(false), TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {isTransitioning ? <PixelBat label="Loading next page" /> : null}
      {children}
    </>
  );
}
