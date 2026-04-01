import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useInView } from 'react-intersection-observer';
import SmoothScroll from '../components/creative/SmoothScroll';
import CustomCursor from '../components/creative/CustomCursor';
import CreativeLoadingScreen from '../components/creative/CreativeLoadingScreen';
import CreativeNavbar from '../components/creative/CreativeNavbar';
import { apiRequest } from '../lib/api';

// Lazy load heavy components
const CreativeHero = lazy(() => import('../components/creative/CreativeHero'));
const CreativeTopBlogs = lazy(() => import('../components/creative/CreativeTopBlogs'));
const CreativeTopWriters = lazy(() => import('../components/creative/CreativeTopWriters'));

import { CreativeTicker, CreativeLatestStories, CreativeManifesto, CreativeMakingOf, CreativeTopics } from '../components/creative/CreativeSections';
import CreativeFooter from '../components/creative/CreativeFooter';
import '../creative.css';

export default function CreativeLanding() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Data Fetching
    apiRequest('/api/posts/?limit=9')
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => {});

    // 2. Failsafe Timeout
    // If the loader hasn't called onComplete in 6 seconds, force it.
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn('CreativeLanding: Loading timeout reached. Forcing entrance.');
        setIsLoading(false);
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  return (
    <div className="c-page">
      <SmoothScroll>
        {isLoading && <CreativeLoadingScreen onComplete={() => setIsLoading(false)} />}
        <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.8s ease' }}>
          <CustomCursor />
          <CreativeNavbar />
          
          <SectionWrapper threshold={0.05}>
            <CreativeHero />
          </SectionWrapper>

          <CreativeTicker />
          <CreativeManifesto />

          <SectionWrapper threshold={0.1}>
            <CreativeTopBlogs />
          </SectionWrapper>

          <CreativeLatestStories posts={posts} />

          <SectionWrapper threshold={0.1}>
            <CreativeTopWriters />
          </SectionWrapper>

          <CreativeMakingOf posts={posts} />
          <CreativeTopics />
          <CreativeFooter />
        </div>
      </SmoothScroll>
    </div>
  );
}

// Wrapper to handle Intersection Observation and Lazy Loading correctly
function SectionWrapper({ children, threshold = 0.1 }) {
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: threshold,
  });

  return (
    <div ref={ref} className="c-section-observable" style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <ErrorBoundary fallback={<div className="c-error-placeholder">3D Scene Unavailable</div>}>
        <Suspense fallback={null}>
          {/* Clone element to pass inView prop to the lazy component */}
          {React.cloneElement(children, { inView })}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

// Simple functional error boundary for WebGL crashes
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("WebGL/Section Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
